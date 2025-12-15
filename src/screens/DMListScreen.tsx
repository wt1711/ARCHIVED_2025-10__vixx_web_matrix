import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MatrixClient, Room } from 'matrix-js-sdk';
import { initMatrixClient, getMatrixClient, MatrixCredentials } from '../matrixClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

type DMRoomItem = {
  roomId: string;
  name: string;
  lastMessage?: string;
  lastEventTime?: number;
  unreadCount: number;
  avatarUrl?: string;
};

type DMListScreenProps = {
  onSelectRoom: (roomId: string) => void;
  onClose?: () => void;
};

export function DMListScreen({ onSelectRoom, onClose }: DMListScreenProps) {
  const [rooms, setRooms] = useState<DMRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mx, setMx] = useState<MatrixClient | null>(null);

  const loadMatrixClient = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('matrixCredentials');
      if (!saved) {
        setLoading(false);
        return;
      }

      const credentials: MatrixCredentials = JSON.parse(saved);
      console.log('credentials:', credentials);
      if (!credentials.userId || !credentials.deviceId || !credentials.accessToken || !credentials.matrixHost) {
        setLoading(false);
        return;
      }

      const client = await initMatrixClient(credentials);
      setMx(client);

      // Load rooms immediately - client is ready after startClient
      // Use a small delay to ensure initial sync has started
      setTimeout(() => {
        loadRooms(client);
      }, 1000);
    } catch (error) {
      console.error('Failed to initialize Matrix client:', error);
      setLoading(false);
    }
  }, []);

  const loadRooms = useCallback((client: MatrixClient) => {
    try {
      // Use getVisibleRooms instead of getRooms (matches vixx-native-v2)
      const allRooms = client.getVisibleRooms();
      
      // Filter for direct message rooms (rooms with only 2 members)
      const dmRooms: DMRoomItem[] = allRooms
        .map((room: Room) => {
          const members = room.getJoinedMembers();
          const otherMember = members.find(m => m.userId !== client.getUserId());
          const name = otherMember?.name || room.name || 'Unknown';
          
          const timeline = room.timeline;
          const lastEvent = timeline[timeline.length - 1];
          let lastMessage = '';
          let lastEventTime = 0;
          
          if (lastEvent) {
            lastEventTime = lastEvent.getTs();
            const content = lastEvent.getContent();
            if (content.msgtype === 'm.text') {
              lastMessage = content.body || '';
            } else if (content.msgtype === 'm.image') {
              lastMessage = '📷 Image';
            } else if (content.msgtype === 'm.video') {
              lastMessage = '🎥 Video';
            } else if (content.msgtype === 'm.file') {
              lastMessage = '📎 File';
            } else {
              lastMessage = 'Message';
            }
          }

          const unreadCount = room.getUnreadNotificationCount();
          const avatarUrl = otherMember?.getAvatarUrl(client.getHomeserverUrl(), 96, 96, 'crop', true, false);

          return {
            roomId: room.roomId,
            name,
            lastMessage,
            lastEventTime,
            unreadCount: unreadCount || 0,
            avatarUrl: avatarUrl ? client.mxcUrlToHttp(avatarUrl) || undefined : undefined,
          };
        })
        .sort((a, b) => (b.lastEventTime || 0) - (a.lastEventTime || 0));

      setRooms(dmRooms);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMatrixClient();
  }, [loadMatrixClient]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const client = getMatrixClient();
    if (client) {
      loadRooms(client);
    } else {
      loadMatrixClient();
    }
  }, [loadMatrixClient, loadRooms]);

  const renderRoomItem = ({ item }: { item: DMRoomItem }) => {
    const formatTime = (timestamp?: number) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days === 0) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } else if (days === 1) {
        return 'Yesterday';
      } else if (days < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    };

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    return (
      <TouchableOpacity
        style={styles.roomItem}
        onPress={() => onSelectRoom(item.roomId)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>
          )}
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.roomContent}>
          <View style={styles.roomHeader}>
            <Text style={styles.roomName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.lastEventTime && (
              <Text style={styles.roomTime}>{formatTime(item.lastEventTime)}</Text>
            )}
          </View>
          {item.lastMessage && (
            <Text style={styles.roomLastMessage} numberOfLines={1}>
              {item.lastMessage}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Direct Messages</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E4405F" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Direct Messages</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      {rooms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No direct messages yet</Text>
          <Text style={styles.emptySubtext}>Start a conversation to see it here</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          renderItem={renderRoomItem}
          keyExtractor={(item) => item.roomId}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E4405F" />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    paddingVertical: 8,
  },
  roomItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e0e0e0',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E4405F',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E4405F',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  roomContent: {
    flex: 1,
    justifyContent: 'center',
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  roomTime: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  roomLastMessage: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

