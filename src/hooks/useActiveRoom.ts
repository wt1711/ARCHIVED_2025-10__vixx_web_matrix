import { useState, useEffect } from 'react';
import { Room, SyncState } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';

export const useActiveRoom = (targetRoomId?: string) => {
  const { client } = useMatrixClient();
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Reset state whenever dependencies change to prevent stale UI
    let isMounted = true;
    setIsLoading(true);
    setRoom(null);

    if (!client) return;

    // 2. Resolution Logic: Queries the Matrix Client (Source of Truth)
    const resolveRoom = () => {
      if (!isMounted) return false;

      const rooms = client.getVisibleRooms();
      let selected: Room | null = null;

      if (targetRoomId) {
        selected = client.getRoom(targetRoomId);
      } else if (rooms.length > 0) {
        // Default: Sort by last active timestamp descending
        selected = rooms.sort(
          (a, b) => b.getLastActiveTimestamp() - a.getLastActiveTimestamp()
        )[0];
      }

      if (selected) {
        setRoom(selected);
        setIsLoading(false);
        return true; // Found
      }
      return false; // Not found
    };

    // 3. Initial Check
    if (resolveRoom()) return;

    // 4. Event Listeners
    const onRoom = () => resolveRoom();

    const onSync = (state: SyncState) => {
      if (state === 'PREPARED') {
        // Sync finished. If we still haven't found a room, we can stop loading.
        if (!resolveRoom()) {
          if (isMounted) setIsLoading(false);
        }
      }
    };

    client.on('Room' as any, onRoom);
    client.on('sync' as any, onSync);

    // 5. Edge Case: Client already synced before we subscribed
    if (client.getSyncState() === 'PREPARED') {
      if (!resolveRoom()) {
        if (isMounted) setIsLoading(false);
      }
    }

    // 6. Cleanup
    return () => {
      isMounted = false;
      client.removeListener('Room' as any, onRoom);
      client.removeListener('sync' as any, onSync);
    };
  }, [client, targetRoomId]);

  return { room, isLoading };
};
