import { useMatrixClient } from './useMatrixClient';
import { parseMessageContent } from '../utils/slashCommands';

export const useMessageSender = (roomId: string | null) => {
  const { client } = useMatrixClient();

  const sendMessage = async (text: string) => {
    if (!client || !roomId) {
      throw new Error('Cannot send message: client or roomId not available');
    }

    const content = parseMessageContent(text);
    await client.sendEvent(roomId, 'm.room.message', content);
  };

  return { sendMessage };
};
