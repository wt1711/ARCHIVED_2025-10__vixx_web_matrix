import { useCallback, useEffect, useState } from 'react';
import { Room, RoomEvent, ClientEvent } from 'matrix-js-sdk';
import { getMatrixClient } from '../matrixClient';
import { useMDirects } from '../utils/mDirectUtils';
import { IsBotPrivateChat, isRoom } from '../utils/room';

/**
 * Hook to get all direct message rooms
 * Uses m.direct account data to filter rooms (matches NextJS implementation)
 */
export const useDirectRooms = () => {
  const [directRooms, setDirectRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mx = getMatrixClient();
  const mDirects = useMDirects(mx);

  const updateDirectRooms = useCallback(() => {
    if (!mx) {
      setIsLoading(false);
      return;
    }

    const allRooms = mx.getVisibleRooms();

    // Filter for direct message rooms using m.direct account data
    // This matches the NextJS implementation exactly
    const directs = allRooms.filter((room) => isRoom(room) && !mDirects.has(room.roomId) && !IsBotPrivateChat(room?.name));

    // Sort by last active timestamp (most recent first)
    const sorted = directs.sort((a, b) => {
      return b.getLastActiveTimestamp() - a.getLastActiveTimestamp();
    });

    setDirectRooms(sorted);
    setIsLoading(false);
  }, [mx, mDirects]);

  useEffect(() => {
    if (!mx) {
      setIsLoading(false);
      return;
    }

    // Initial load
    updateDirectRooms();

    // Listen for timeline events (new messages)
    mx.on(RoomEvent.Timeline, updateDirectRooms);

    // Listen for room name changes
    mx.on(RoomEvent.Name, updateDirectRooms);

    // Listen for new rooms
    mx.on(ClientEvent.Room, updateDirectRooms);

    // Listen for member changes (people joining/leaving)
    mx.on(RoomEvent.MyMembership, updateDirectRooms);

    return () => {
      mx.off(RoomEvent.Timeline, updateDirectRooms);
      mx.off(RoomEvent.Name, updateDirectRooms);
      mx.off(ClientEvent.Room, updateDirectRooms);
      mx.off(RoomEvent.MyMembership, updateDirectRooms);
    };
  }, [mx, updateDirectRooms]);

  return { directRooms, isLoading };
};

