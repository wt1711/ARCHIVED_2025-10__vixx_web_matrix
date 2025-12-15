import { useState, useEffect, useCallback, useRef } from 'react';
import { RoomEvent, ClientEvent, Room, Direction } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';
import { transformRoom, RoomListItem } from '../utils/roomTransformer';

const MIN_MESSAGES_PER_ROOM = 1;

/**
 * Checks if a room should be hidden from the room list
 * Add new filtering criteria here as needed
 */
function shouldHideRoom(room: Room): boolean {
  const timestamp = room.getLastActiveTimestamp();

  // Hide rooms with invalid timestamps (0, NaN, or very old dates indicating invalid)
  if (!timestamp || timestamp <= 0 || isNaN(timestamp)) {
    return true;
  }

  return false;
}

export const useRoomList = () => {
  const { client, isReady } = useMatrixClient();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreloading, setIsPreloading] = useState(false);
  const preloadedRooms = useRef<Set<string>>(new Set());

  const updateRooms = useCallback(() => {
    if (!client) return;

    const visibleRooms = client.getVisibleRooms();

    console.log('visibleRooms:', visibleRooms);

    // Filter out invalid rooms
    const validRooms = visibleRooms.filter((room) => !shouldHideRoom(room));

    // Sort by last active timestamp (most recent first)
    const sortedRooms = validRooms.sort((a, b) => {
      return b.getLastActiveTimestamp() - a.getLastActiveTimestamp();
    });

    const transformedRooms = sortedRooms.map((room) =>
      transformRoom(room, client)
    );

    setRooms(transformedRooms);
    setIsLoading(false);
  }, [client]);

  // Preload messages for all rooms
  const preloadRoomMessages = useCallback(async () => {
    if (!client || isPreloading) return;

    const visibleRooms = client
      .getVisibleRooms()
      .filter((room) => !shouldHideRoom(room));
    const roomsToPreload = visibleRooms.filter(
      (room) => !preloadedRooms.current.has(room.roomId)
    );

    if (roomsToPreload.length === 0) return;

    setIsPreloading(true);
    console.log(
      '[useRoomList] Preloading messages for',
      roomsToPreload.length,
      'rooms'
    );

    for (const room of roomsToPreload) {
      try {
        const timeline = room.getLiveTimeline();
        const events = timeline.getEvents();
        const messageCount = events.filter(
          (e) => e.getType() === 'm.room.message'
        ).length;

        // Only paginate if we don't have enough messages
        if (messageCount < MIN_MESSAGES_PER_ROOM) {
          const token = timeline.getPaginationToken(Direction.Backward);
          if (token) {
            await client.paginateEventTimeline(timeline, {
              backwards: true,
              limit: 10,
            });
          }
        }

        preloadedRooms.current.add(room.roomId);
      } catch (error) {
        console.error(
          '[useRoomList] Failed to preload room:',
          room.roomId,
          error
        );
      }
    }

    setIsPreloading(false);
    // Update rooms after preloading to show correct last messages
    updateRooms();
    console.log('[useRoomList] Preloading complete');
  }, [client, isPreloading, updateRooms]);

  useEffect(() => {
    if (!client || !isReady) return;

    // Initial load
    updateRooms();

    // Preload messages for all rooms after initial sync
    preloadRoomMessages();

    // Listen for timeline events (new messages)
    client.on(RoomEvent.Timeline, updateRooms);

    // Listen for room name changes
    client.on(RoomEvent.Name, updateRooms);

    // Listen for new rooms
    client.on(ClientEvent.Room, updateRooms);

    return () => {
      client.off(RoomEvent.Timeline, updateRooms);
      client.off(RoomEvent.Name, updateRooms);
      client.off(ClientEvent.Room, updateRooms);
    };
  }, [client, isReady, updateRooms, preloadRoomMessages]);

  return { rooms, isLoading, isPreloading };
};
