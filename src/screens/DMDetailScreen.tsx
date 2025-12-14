import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MatrixClient, Room, MatrixEvent } from 'matrix-js-sdk';
import { getMatrixClient } from '../matrixClient';

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

type DMDetailScreenProps = {
  roomId: string;
  onBack: () => void;
};

export function DMDetailScreen({ roomId, onBack }: DMDetailScreenProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [roomName, setRoomName] = useState('Loading...');
  const flatListRef = useRef<FlatList>(null);
  const mx = getMatrixClient();

  useEffect(() => {
    if (!mx) {
      setLoading(false);
      return;
    }

    const loadRoom = () => {
      const roomObj = mx.getRoom(roomId);
      if (!roomObj) {
        setLoading(false);
        return;
      }

      setRoom(roomObj);
      const members = roomObj.getJoinedMembers();
      const otherMember = members.find(m => m.userId !== mx.getUserId());
      const name = otherMember?.name || roomObj.name || 'Unknown';
      setRoomName(name);

      // Load timeline events
      const timeline = roomObj.timeline;
      const messageItems: MessageItem[] = timeline
        .filter((event: MatrixEvent) => event.getType() === 'm.room.message')
        .map((event: MatrixEvent) => {
          const content = event.getContent();
          const sender = event.getSender() || '';
          const senderMember = roomObj.getMember(sender);
          const senderName = senderMember?.name || sender.split('@')[0]?.split(':')[0] || 'Unknown';
          const isOwn = sender === mx.getUserId();
          const avatarUrl = senderMember?.getAvatarUrl(mx.getHomeserverUrl(), 96, 96, 'crop');

          return {
            eventId: event.getId() || '',
            sender,
            senderName,
            content: content.body || '',
            timestamp: event.getTs(),
            msgtype: content.msgtype,
            isOwn,
            avatarUrl: avatarUrl ? mx.mxcUrlToHttp(avatarUrl) || undefined : undefined,
          };
        });

      setMessages(messageItems);
      setLoading(false);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    };

    loadRoom();

    // Listen for new events
    const onRoomTimeline = (event: MatrixEvent, roomObj: Room | null) => {
      if (roomObj?.roomId === roomId && event.getType() === 'm.room.message') {
        const content = event.getContent();
        const sender = event.getSender() || '';
        const senderMember = roomObj.getMember(sender);
        const senderName = senderMember?.name || sender.split('@')[0]?.split(':')[0] || 'Unknown';
        const isOwn = sender === mx?.getUserId();
        const avatarUrl = senderMember?.getAvatarUrl(mx?.getHomeserverUrl() || '', 96, 96, 'crop');

        const newMessage: MessageItem = {
          eventId: event.getId() || '',
          sender,
          senderName,
          content: content.body || '',
          timestamp: event.getTs(),
          msgtype: content.msgtype,
          isOwn: isOwn || false,
          avatarUrl: avatarUrl ? mx?.mxcUrlToHttp(avatarUrl) || undefined : undefined,
        };

        setMessages((prev) => [...prev, newMessage]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    mx.on('Room.timeline', onRoomTimeline);

    return () => {
      mx.removeListener('Room.timeline', onRoomTimeline);
    };
  }, [mx, roomId]);

  const handleSend = useCallback(async () => {
    if (!mx || !inputText.trim() || sending) return;

    setSending(true);
    try {
      const content = {
        msgtype: 'm.text',
        body: inputText.trim(),
      };

      await mx.sendEvent(roomId, 'm.room.message', content);
      setInputText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  }, [mx, roomId, inputText, sending]);

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

  const renderMessage = ({ item }: { item: MessageItem }) => {
    return (
      <View
        style={[
          styles.messageContainer,
          item.isOwn ? styles.messageContainerOwn : styles.messageContainerOther,
        ]}
      >
        {!item.isOwn && (
          <View style={styles.avatarContainer}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.messageAvatar} />
            ) : (
              <View style={[styles.messageAvatar, styles.avatarPlaceholder]}>
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
          <Text style={item.isOwn ? styles.messageTextOwn : styles.messageTextOther}>
            {item.content}
          </Text>
          <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{roomName}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E4405F" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {roomName}
          </Text>
          <View style={styles.backButton} />
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.eventId}
          contentContainerStyle={styles.messagesList}
          inverted={false}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            multiline
            maxLength={5000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending || !inputText.trim()}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    minWidth: 40,
  },
  backButtonText: {
    fontSize: 24,
    color: '#E4405F',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  messageContainerOwn: {
    justifyContent: 'flex-end',
  },
  messageContainerOther: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E4405F',
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
  messageTextOwn: {
    fontSize: 15,
    color: '#fff',
  },
  messageTextOther: {
    fontSize: 15,
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#E4405F',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});


