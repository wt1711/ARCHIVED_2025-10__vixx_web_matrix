# Direct Messages Implementation - React Native

This document describes the React Native implementation of Direct Messages, cloned from the NextJS version in the `external` folder.

## Overview

The implementation includes:
- ✅ Direct Message List screen with realtime updates
- ✅ Direct Message Detail screen with full conversation view
- ✅ Realtime message loading and updates
- ✅ AI Assistant integration with payment verification
- ✅ Payment modal for AI feature access
- ✅ Message sending and receiving
- ✅ Room timeline with message history

## Files Created

### Screens
- `src/screens/DirectMessageListScreen.tsx` - List of all direct message conversations
- `src/screens/DirectMessageDetailScreen.tsx` - Individual conversation detail view

### Hooks
- `src/hooks/useDirectRooms.ts` - Hook to get and monitor direct message rooms
- `src/hooks/usePaymentVerification.tsx` - Hook for payment status verification

### Components
- `src/components/room/RoomViewHeader.tsx` - Header with room info and AI button
- `src/components/room/RoomTimeline.tsx` - Message timeline with realtime updates
- `src/components/room/RoomInput.tsx` - Message input and sending
- `src/components/ai/AIAssistantModal.tsx` - AI Assistant interface
- `src/components/payment/PaymentModal.tsx` - Payment verification modal

### Context & Services
- `src/context/AIAssistantContext.tsx` - AI Assistant state management
- `src/services/aiService.ts` - AI API integration (OpenAI consultation, response generation, grading)
- `src/services/paymentStorageService.ts` - Payment status checking and validation

## Usage

### DirectMessageListScreen

```tsx
import { DirectMessageListScreen } from './src/screens/DirectMessageListScreen';

<DirectMessageListScreen
  onSelectRoom={(roomId) => {
    // Navigate to detail screen
    navigation.navigate('DirectMessageDetail', { roomId });
  }}
  onClose={() => {
    // Close the list screen
  }}
  onCreateChat={() => {
    // Open create chat screen
  }}
  selectedRoomId={currentRoomId} // Optional: highlight selected room
/>
```

### DirectMessageDetailScreen

```tsx
import { DirectMessageDetailScreen } from './src/screens/DirectMessageDetailScreen';

<DirectMessageDetailScreen
  roomId={roomId}
  onBack={() => {
    // Navigate back
    navigation.goBack();
  }}
  eventId={eventId} // Optional: scroll to specific message
/>
```

## Features

### Realtime Message Updates
- Messages automatically update when new events arrive
- Timeline listens to `RoomEvent.Timeline` for realtime updates
- Auto-scrolls to bottom on new messages

### AI Assistant
- Payment-gated AI features
- Generate response suggestions
- Chat with AI about conversation context
- Message grading and tone analysis
- Regenerate responses with different specs

### Payment Verification
- Checks payment status on mount
- Shows payment modal when AI features are accessed
- Refreshes payment status after successful payment

## API Configuration

### Payment Service
The payment service uses the API base URL from environment:
- Default: `https://api.lvbrd.xyz/api`
- Set `process.env.API_BASE_URL` to override

### AI Service
AI service endpoints:
- Consultation: `https://wmaide-server.vercel.app/api/suggestion`
- Response Generation: `https://wmaide-server.vercel.app/api/generate-response`
- Message Grading: `https://wmaide-server.vercel.app/api/grade-response`

## Differences from NextJS Version

1. **No Virtual Scrolling**: React Native FlatList handles virtualization automatically
2. **Simplified UI**: Adapted to React Native components (View, Text, TouchableOpacity)
3. **Modal Instead of Drawer**: AI Assistant uses Modal instead of side drawer
4. **No Slate Editor**: Using TextInput for message input (can be enhanced later)
5. **Direct State Management**: Using React hooks instead of Jotai atoms

## Next Steps

1. **Replace old screens**: Update your navigation to use `DirectMessageListScreen` and `DirectMessageDetailScreen` instead of `DMListScreen` and `DMDetailScreen`

2. **Add image/file support**: Enhance `RoomInput` to support file uploads and images

3. **Enhance AI features**: Add more AI capabilities like tone sliders, persona selection

4. **Add message reactions**: Implement message reactions and replies

5. **Add typing indicators**: Show when other users are typing

## Notes

- All components use the Matrix client from `getMatrixClient()` hook
- Payment verification is required before accessing AI features
- The implementation maintains the same functionality as the NextJS version while adapting to React Native patterns


