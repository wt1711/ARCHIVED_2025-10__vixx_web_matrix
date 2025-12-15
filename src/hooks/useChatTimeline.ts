import { useState, useEffect, useCallback, useRef } from 'react';
import { MatrixEvent, Room, Direction } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';

export interface NativeMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  isMe: boolean;
}

/**
 * Patterns to filter out admin/bot messages
 * Add new patterns here as needed
 */
const HIDDEN_MESSAGE_PATTERNS: RegExp[] = [
  /Failed to load message/i,
  /Your message was not bridged/i,
  /⚠️.*not bridged/i,
];

/**
 * Message filter configuration
 * Easy to update filtering rules here
 */
const MESSAGE_FILTERS = {
  // Filter empty messages (unsent/pending)
  filterEmpty: true,
  // Filter messages matching hidden patterns
  filterHiddenPatterns: true,
};

/**
 * Checks if a message should be hidden based on all filter rules
 */
function shouldHideMessage(text: string): boolean {
  // Filter empty strings (unsent messages)
  if (MESSAGE_FILTERS.filterEmpty && text.trim() === '') {
    return true;
  }

  // Filter pattern matches
  if (MESSAGE_FILTERS.filterHiddenPatterns) {
    if (HIDDEN_MESSAGE_PATTERNS.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  return false;
}

function mapEventToMessage(
  evt: MatrixEvent,
  myUserId: string
): NativeMessage | null {
  if (evt.getType() !== 'm.room.message') {
    return null;
  }

  // Filter out unsent/pending messages (status is null when successfully sent)
  const eventStatus = evt.status;
  if (eventStatus !== null && eventStatus !== undefined) {
    return null;
  }

  const content = evt.getContent();
  const text = content.body || '';

  // Filter out admin/bot messages
  if (shouldHideMessage(text)) {
    return null;
  }

  const senderId = evt.getSender() || '';

  return {
    id: evt.getId() || '',
    text,
    senderId,
    senderName: evt.sender?.name || senderId,
    timestamp: evt.getTs(),
    isMe: senderId === myUserId,
  };
}

const MIN_MESSAGES_TO_DISPLAY = 10;

export const useChatTimeline = (roomId: string | null) => {
  const { client } = useMatrixClient();
  const [messages, setMessages] = useState<NativeMessage[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const roomRef = useRef<Room | null>(null);
  const initialLoadDone = useRef(false);

  // Helper to extract messages from timeline events
  const extractMessages = useCallback(
    (events: MatrixEvent[], myUserId: string): NativeMessage[] => {
      return events
        .map((evt) => mapEventToMessage(evt, myUserId))
        .filter((msg): msg is NativeMessage => msg !== null);
    },
    []
  );

  // Load older messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!client || !roomRef.current || isLoadingMore || !hasMoreMessages) {
      return;
    }

    setIsLoadingMore(true);
    const myUserId = client.getUserId() || '';
    const room = roomRef.current;

    try {
      const timeline = room.getLiveTimeline();
      const paginationToken = timeline.getPaginationToken(Direction.Backward);

      if (!paginationToken) {
        setHasMoreMessages(false);
        setIsLoadingMore(false);
        return;
      }

      // Paginate backwards to load older messages
      await client.paginateEventTimeline(timeline, {
        backwards: true,
        limit: 10,
      });

      // Re-extract all messages from timeline
      const allEvents = timeline.getEvents();
      const allMessages = extractMessages(allEvents, myUserId);
      setMessages(allMessages);

      // Check if we can load more
      const newToken = timeline.getPaginationToken(Direction.Backward);
      setHasMoreMessages(!!newToken);
    } catch (error) {
      console.error('[useChatTimeline] Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [client, isLoadingMore, hasMoreMessages, extractMessages]);

  useEffect(() => {
    if (!client || !roomId) {
      return;
    }

    const myUserId = client.getUserId() || '';

    // Initial load
    const room = client.getRoom(roomId);
    roomRef.current = room;

    if (room) {
      const timeline = room.getLiveTimeline();
      const events = timeline.getEvents();
      const initialMessages = extractMessages(events, myUserId);
      setMessages(initialMessages);
      const token = timeline.getPaginationToken(Direction.Backward);
      setHasMoreMessages(!!token);
    }

    // Subscription for new messages
    const handleTimeline = (
      event: MatrixEvent,
      eventRoom: Room | undefined,
      toStartOfTimeline: boolean
    ) => {
      if (eventRoom?.roomId !== roomId) {
        return;
      }
      if (toStartOfTimeline) {
        // Message was added to start (from pagination), handled by loadMoreMessages
        return;
      }

      const newMessage = mapEventToMessage(event, myUserId);
      if (newMessage) {
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    client.on('Room.timeline' as any, handleTimeline);

    return () => {
      client.off('Room.timeline' as any, handleTimeline);
      initialLoadDone.current = false;
    };
  }, [client, roomId, extractMessages]);

  // Auto-load more messages on initial mount if we have too few
  useEffect(() => {
    if (!client || !roomId || !roomRef.current) return;
    if (isLoadingMore) return;

    // Keep loading until we have enough messages or no more to load
    if (messages.length < MIN_MESSAGES_TO_DISPLAY && hasMoreMessages) {
      console.log(
        '[useChatTimeline] Auto-loading: only',
        messages.length,
        'messages, need',
        MIN_MESSAGES_TO_DISPLAY
      );
      loadMoreMessages();
    } else {
      initialLoadDone.current = true;
    }
  }, [
    client,
    roomId,
    messages.length,
    hasMoreMessages,
    isLoadingMore,
    loadMoreMessages,
  ]);

  return { messages, loadMoreMessages, isLoadingMore, hasMoreMessages };
};
