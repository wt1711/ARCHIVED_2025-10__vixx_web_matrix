import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Room, MatrixEvent, RoomEvent, Direction } from 'matrix-js-sdk';
import { getMatrixClient } from '../../matrixClient';

type MessageItem = {
  eventId: string;
  sender: string;
  senderName: string;
  content: string;
  timestamp: number;
  msgtype?: string;
  isOwn: boolean;
  avatarUrl?: string;
};

type RoomTimelineProps = {
  room: Room;
  eventId?: string;
};

export function RoomTimeline({ room, eventId }: RoomTimelineProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const mx = getMatrixClient();
  const isInitialLoad = useRef(true);

  const mapEventToMessage = useCallback((event: MatrixEvent): MessageItem | null => {
    if (!mx || event.getType() !== 'm.room.message') return null;

    const content = event.getContent();
    const sender = event.getSender() || '';
    const senderMember = room.getMember(sender);
    const senderName = senderMember?.name || sender.split('@')[0]?.split(':')[0] || 'Unknown';
    const isOwn = sender === mx.getUserId();
    const avatarUrl = senderMember?.getAvatarUrl(mx.getHomeserverUrl(), 96, 96, 'crop', true, false);

    let contentText = '';
    if (content.msgtype === 'm.text') {
      contentText = content.body || '';
    } else if (content.msgtype === 'm.image') {
      contentText = '📷 Image';
    } else if (content.msgtype === 'm.video') {
      contentText = '🎥 Video';
    } else if (content.msgtype === 'm.file') {
      contentText = '📎 File';
    } else {
      contentText = 'Message';
    }

    return {
      eventId: event.getId() || '',
      sender,
      senderName,
      content: contentText,
      timestamp: event.getTs(),
      msgtype: content.msgtype,
      isOwn,
      avatarUrl: avatarUrl ? mx.mxcUrlToHttp(avatarUrl) || undefined : undefined,
    };
  }, [mx, room]);

  const loadMessages = useCallback(() => {
    if (!mx || !room) return;

    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();
    
    const messageItems: MessageItem[] = events
      .map(mapEventToMessage)
      .filter((item): item is MessageItem => item !== null);

    setMessages(messageItems);
    setLoading(false);

    // Check if we can paginate backwards
    const paginationToken = timeline.getPaginationToken(Direction.Backward);
    setCanLoadMore(!!paginationToken);

    // Scroll to bottom after initial load
    if (isInitialLoad.current && messageItems.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
        isInitialLoad.current = false;
      }, 100);
    }
  }, [mx, room, mapEventToMessage]);

  const loadMoreMessages = useCallback(async () => {
    if (!mx || !room || loadingMore || !canLoadMore) return;

    setLoadingMore(true);
    try {
      const timeline = room.getLiveTimeline();
      const paginationToken = timeline.getPaginationToken(Direction.Backward);
      
      if (!paginationToken) {
        setCanLoadMore(false);
        setLoadingMore(false);
        return;
      }

      // Store current scroll position
      const currentFirstMessageId = messages.length > 0 ? messages[0].eventId : null;

      // Paginate backwards to load older messages
      await mx.paginateEventTimeline(timeline, {
        backwards: true,
        limit: 50, // Load 50 messages at a time
      });

      // Reload messages after pagination
      loadMessages();

      // Try to maintain scroll position
      if (currentFirstMessageId) {
        setTimeout(() => {
          const newIndex = messages.findIndex(m => m.eventId === currentFirstMessageId);
          if (newIndex >= 0) {
            flatListRef.current?.scrollToIndex({ index: newIndex, animated: false });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
      setCanLoadMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [mx, room, loadingMore, canLoadMore, messages, loadMessages]);

  useEffect(() => {
    if (!mx || !room) {
      setLoading(false);
      return;
    }

    loadMessages();

    // Listen for new events
    const onRoomTimeline = (event: MatrixEvent, roomObj: Room | null) => {
      if (roomObj?.roomId === room.roomId) {
        loadMessages();
        // Auto-scroll to bottom on new message (only if user is at bottom)
        if (event.getType() === 'm.room.message') {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    };

    mx.on(RoomEvent.Timeline, onRoomTimeline);

    return () => {
      mx.off(RoomEvent.Timeline, onRoomTimeline);
    };
  }, [mx, room, loadMessages]);

  // Scroll to specific event if eventId is provided
  useEffect(() => {
    if (eventId && messages.length > 0) {
      const index = messages.findIndex(m => m.eventId === eventId);
      if (index >= 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index, animated: true });
        }, 200);
      }
    }
  }, [eventId, messages]);

  // All hooks must be called before any conditional returns
  const handleScroll = useCallback((event: any) => {
    const { contentOffset } = event.nativeEvent;
    // Check if user scrolled near the top (within 200px)
    if (contentOffset.y < 200 && canLoadMore && !loadingMore) {
      loadMoreMessages();
    }
  }, [canLoadMore, loadingMore, loadMoreMessages]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderHeader = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#E4405F" />
        <Text style={styles.loadingMoreText}>Loading older messages...</Text>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: MessageItem }) => {
    return (
      <View
        style={[
          styles.messageContainer,
          item.isOwn ? styles.messageOwn : styles.messageOther,
        ]}
      >
        {!item.isOwn && (
          <View style={styles.avatarContainer}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{getInitials(item.senderName)}</Text>
              </View>
            )}
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            item.isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
          ]}
        >
          {!item.isOwn && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          <Text
            style={[
              styles.messageText,
              item.isOwn ? styles.messageTextOwn : styles.messageTextOther,
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              item.isOwn ? styles.messageTimeOwn : styles.messageTimeOther,
            ]}
          >
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E4405F" />
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderMessage}
      keyExtractor={(item) => item.eventId}
      contentContainerStyle={styles.listContent}
      inverted={false}
      onScroll={handleScroll}
      scrollEventThrottle={400}
      ListHeaderComponent={renderHeader}
      onContentSizeChange={() => {
        // Auto-scroll to bottom only on initial load
        if (isInitialLoad.current && messages.length > 0) {
          flatListRef.current?.scrollToEnd({ animated: false });
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageOwn: {
    justifyContent: 'flex-end',
  },
  messageOther: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#E4405F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  messageBubbleOwn: {
    backgroundColor: '#E4405F',
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#fff',
  },
  messageTextOther: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  messageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeOther: {
    color: '#999',
  },
  loadingMoreContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
});

