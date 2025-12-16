import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Room } from 'matrix-js-sdk';
import { getMatrixClient } from '../../matrixClient';
import { getRoomAvatarUrl } from '../../utils/room';

type PaymentState = {
  isLoading: boolean;
  hasPaid: boolean;
};

type RoomViewHeaderProps = {
  room: Room;
  onBack: () => void;
  onAIAssistantClick: () => void;
  paymentState: PaymentState;
};

export function RoomViewHeader({
  room,
  onBack,
  onAIAssistantClick,
  paymentState,
}: RoomViewHeaderProps) {
  const mx = getMatrixClient();

  // Use room.name directly - Matrix SDK handles the display name correctly
  // This matches the NextJS implementation
  const roomName = room.name || 'Unknown';

  // Get avatar from fallback member for direct messages, or room avatar
  // Get MXC URL and convert to HTTP with authentication token in URL
  const avatarUrl = mx ? getRoomAvatarUrl(mx, room, 96, true) : undefined;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>{getInitials(roomName)}</Text>
        </View>
      )}

      <View style={styles.headerContent}>
        <Text style={styles.roomName} numberOfLines={1}>
          {roomName}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onAIAssistantClick}
        style={styles.aiButton}
        disabled={paymentState.isLoading}
      >
        <Text style={styles.aiButtonText}>🤖</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#E4405F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  aiButton: {
    padding: 8,
    marginLeft: 8,
  },
  aiButtonText: {
    fontSize: 24,
  },
});

