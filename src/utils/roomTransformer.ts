import { Room, MatrixClient } from 'matrix-js-sdk';

/**
 * UI-ready room item for FlatList consumption
 */
export interface RoomListItem {
  /** Unique room identifier (Matrix room ID) */
  id: string;

  /** Display name for the room/conversation */
  name: string;

  /** Avatar URL (mxc:// URL converted to HTTP, or empty string) */
  avatar: string;

  /** Preview of the last message in the room */
  lastMessage: string;

  /** Human-readable timestamp (e.g., "2m ago", "Yesterday") */
  timestamp: string;

  /** Whether the room has unread messages */
  unread: boolean;
}

/**
 * Formats a timestamp into a human-readable relative time string
 */
export function formatRelativeTime(ts: number): string {
  if (!ts) return '';

  const now = Date.now();
  const diffMs = now - ts;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    const date = new Date(ts);
    return date.toLocaleDateString();
  }
}

/**
 * Patterns for messages that should be hidden from preview
 * Keep in sync with useChatTimeline.ts HIDDEN_MESSAGE_PATTERNS
 */
const HIDDEN_MESSAGE_PATTERNS: RegExp[] = [
  /Failed to load message/i,
  /Your message was not bridged/i,
  /⚠️.*not bridged/i,
];

function shouldHideMessage(text: string): boolean {
  return HIDDEN_MESSAGE_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Transforms a Matrix Room into a UI-ready RoomListItem
 */
export function transformRoom(room: Room, client: MatrixClient): RoomListItem {
  // Find the last actual message (m.room.message), not state events
  let lastMessage = 'No messages';
  const timeline = room.getLiveTimeline().getEvents();

  for (let i = timeline.length - 1; i >= 0; i--) {
    const event = timeline[i];
    if (event.getType() === 'm.room.message') {
      const body = event.getContent()?.body || '';
      // Skip hidden bot messages
      if (body && !shouldHideMessage(body)) {
        lastMessage = body;
        break;
      }
    }
  }

  let avatar = '';
  const avatarUrl = room.getAvatarUrl(client.baseUrl, 96, 96, 'crop');
  if (avatarUrl) {
    avatar = avatarUrl;
  }

  return {
    id: room.roomId,
    name: room.name || 'Unnamed Room',
    avatar,
    lastMessage,
    timestamp: formatRelativeTime(room.getLastActiveTimestamp()),
    unread: room.getUnreadNotificationCount() > 0,
  };
}
