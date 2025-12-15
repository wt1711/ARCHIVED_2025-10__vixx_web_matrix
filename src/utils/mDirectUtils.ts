import React from 'react';
import { MatrixClient, MatrixEvent, ClientEvent } from 'matrix-js-sdk';

/**
 * Get m.direct account data and extract direct room IDs
 * This matches the NextJS implementation
 */
export const getMDirects = (mDirectEvent: MatrixEvent | undefined): Set<string> => {
  const roomIds = new Set<string>();
  if (!mDirectEvent) return roomIds;

  const userIdToDirects = mDirectEvent.getContent();

  if (userIdToDirects === undefined) return roomIds;

  Object.keys(userIdToDirects).forEach((userId) => {
    const directs = userIdToDirects[userId];
    if (Array.isArray(directs)) {
      directs.forEach((id) => {
        if (typeof id === 'string') roomIds.add(id);
      });
    }
  });

  return roomIds;
};

/**
 * Hook to get and track m.direct account data
 * Returns a Set of room IDs that are marked as direct messages
 */
export const useMDirects = (mx: MatrixClient | null): Set<string> => {
  const [mDirects, setMDirects] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!mx) {
      setMDirects(new Set());
      return;
    }

    // Get initial m.direct account data
    const mDirectEvent = mx.getAccountData('m.direct');
    if (mDirectEvent) {
      setMDirects(getMDirects(mDirectEvent));
    }

    // Listen for account data updates
    const handleAccountData = (event: MatrixEvent) => {
      if (event.getType() === 'm.direct') {
        setMDirects(getMDirects(event));
      }
    };

    mx.on(ClientEvent.AccountData, handleAccountData);

    return () => {
      mx.off(ClientEvent.AccountData, handleAccountData);
    };
  }, [mx]);

  return mDirects;
};

