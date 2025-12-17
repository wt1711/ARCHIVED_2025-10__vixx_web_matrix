import { EventTimeline, MatrixClient, MatrixEvent, MsgType, Room, RoomMember, RoomType } from "matrix-js-sdk";
import { MessageEvent, StateEvent } from "../types/matrix/room";


export const getStateEvent = (
    room: Room,
    eventType: StateEvent,
    stateKey = ''
  ): MatrixEvent | undefined =>
    room.getLiveTimeline().getState(EventTimeline.FORWARDS)?.getStateEvents(eventType, stateKey) ??
    undefined;
    
export const getRoomAvatarUrl = (
    mx: MatrixClient,
    room: Room,
    size: 32 | 96 = 32,
    useAuthentication = false
  ): string | undefined => {
    const mxcUrl = room.getMxcAvatarUrl();
    const avatarUrl = mxcUrl
      ? mx.mxcUrlToHttp(mxcUrl, size, size, 'crop', undefined, false, useAuthentication) ?? undefined
      : undefined;
    return `${avatarUrl}&access_token=${mx.getAccessToken()}`;
  };


  export const getDirectRoomAvatarUrl = (
    mx: MatrixClient,
    room: Room,
    size: 32 | 96 = 32,
    useAuthentication = false
  ): string | undefined => {
    const mxcUrl = room.getAvatarFallbackMember()?.getMxcAvatarUrl();
  
    if (!mxcUrl) {
      return getRoomAvatarUrl(mx, room, size, useAuthentication);
    }
  
    return (
      mx.mxcUrlToHttp(mxcUrl, size, size, 'crop', undefined, false, useAuthentication) ?? undefined
    );
  };


  export const isRoom = (room: Room | null): boolean => {
    if (!room) return false;
    const event = getStateEvent(room, StateEvent.RoomCreate);
    if (!event) return true;
    return event.getContent().type !== RoomType.Space;
  };

  export const IsBotPrivateChat = (roomName: string | undefined) => {
    if (roomName) {
      // Common bot patterns
      const botPatterns = [/Meta bot Room/i, /Instagram Bot Room/i];
  
      const isBot = botPatterns.some((pattern) => pattern.test(roomName));
      if (isBot) return true;
    }
    return false;
  };


  export const messageEventOnly = (mEvent: MatrixEvent) => {
    const type = mEvent.getType();
    const content = mEvent.getContent();
    return (
      (type === MessageEvent.RoomMessage ||
        type === MessageEvent.RoomMessageEncrypted ||
        type === MessageEvent.Sticker ||
        type === MessageEvent.RoomRedaction ||
        type === MessageEvent.Reaction) &&
      content.msgtype !== MsgType.Notice
    );
  };

  export const getMemberAvatarMxc = (mx: MatrixClient, room: Room, userId: string): string | undefined => {
    // const member = room.getMember(userId); // Revert back to this if needed
    const member = room.getMember(getImpersonatedUserId(userId, room.getMembers()));
    const avatarMxc = member?.getMxcAvatarUrl();
    if (!avatarMxc) return undefined;
    const avatarUrl = mx.mxcUrlToHttp(avatarMxc, 96, 96, 'crop', undefined, false, true);
    if (!avatarUrl) return undefined;
    return `${avatarUrl}&access_token=${mx.getAccessToken()}`;
  };

  const isUserIdMatrix = (userId: string) => !userId.includes('meta');

  export const getImpersonatedUserId = (userId: string, members: RoomMember[]): string => {
    if (members && isUserIdMatrix(userId)) {
      return members.find((member) => member.userId === userId)?.userId || userId;
    }
    return userId || '';
  };

  // Reaction utilities
  export const getReactionContent = (eventId: string, key: string, shortcode?: string) => ({
    'm.relates_to': {
      event_id: eventId,
      key,
      rel_type: 'm.annotation',
    },
    shortcode,
  });

  export const getEventReactions = (room: Room, eventId: string) => {
    return room.getUnfilteredTimelineSet().relations.getChildEventsForEvent(
      eventId,
      'm.annotation' as any,
      MessageEvent.Reaction
    );
  };