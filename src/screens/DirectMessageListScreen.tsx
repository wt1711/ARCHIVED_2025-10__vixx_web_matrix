import React, { useState, useCallback, useMemo } from 'react';
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
import { Room } from 'matrix-js-sdk';
import { useDirectRooms } from '../hooks/useDirectRooms';
import { getMatrixClient } from '../matrixClient';
import { getRoomAvatarUrl } from '../utils/room';
import { useAuth } from '../context/AuthContext';

type DirectMessageListScreenProps = {
  onSelectRoom: (roomId: string) => void;
  onCreateChat?: () => void;
  selectedRoomId?: string;
};

type RoomItem = {
  roomId: string;
  room: Room;
  name: string;
  lastMessage?: string;
  lastEventTime?: number;
  unreadCount: number;
  avatarUrl?: string;
};

export function DirectMessageListScreen({
  onSelectRoom,
  onCreateChat,
  selectedRoomId,
}: DirectMessageListScreenProps) {
  const { directRooms, isLoading } = useDirectRooms();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const mx = getMatrixClient();
  const { logout } = useAuth();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // The useDirectRooms hook will automatically update via event listeners
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const roomItems: RoomItem[] = useMemo(() => {
    setLoading(true);
    if (!mx) return [];

    return directRooms.map((room: Room) => {

      // Use room.name directly - Matrix SDK handles the display name correctly
      // This matches the NextJS implementation
      const name = room.name || 'Unknown';

      // Get last message
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

      const unreadCount = room.getUnreadNotificationCount() || 0;
      const avatarUrl = getRoomAvatarUrl(mx, room, 96, true);

      setLoading(false);

      return {
        roomId: room.roomId,
        room,
        name,
        lastMessage,
        lastEventTime,
        unreadCount,
        avatarUrl,
      };
    });
  }, [directRooms, mx]);

  const renderRoomItem = ({ item }: { item: RoomItem }) => {
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

    const isSelected = selectedRoomId === item.roomId;

    return (
      <TouchableOpacity
        style={[styles.roomItem, isSelected && styles.roomItemSelected]}
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
            {item.lastEventTime ? (
              <Text style={styles.roomTime}>{formatTime(item.lastEventTime)}</Text>
            ) : null}
          </View>
          {item.lastMessage ? (
            <Text style={styles.roomLastMessage} numberOfLines={1}>
              {item.lastMessage}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Direct Messages</Text>
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
        <View style={styles.headerActions}>
          {onCreateChat ? (
            <TouchableOpacity onPress={onCreateChat} style={styles.createButton}>
              <Text style={styles.createButtonText}>+</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
      {roomItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No direct messages yet</Text>
          <Text style={styles.emptySubtext}>Start a conversation to see it here</Text>
          {onCreateChat ? (
            <TouchableOpacity style={styles.emptyButton} onPress={onCreateChat}>
              <Text style={styles.emptyButtonText}>Create Chat</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={roomItems}
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  createButton: {
    padding: 8,
    backgroundColor: '#E4405F',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
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
  roomItemSelected: {
    backgroundColor: '#f5f5f5',
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
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#E4405F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
