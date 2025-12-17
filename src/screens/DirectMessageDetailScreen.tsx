/* eslint-disable no-unreachable */
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Room, MatrixEvent, RoomEvent } from 'matrix-js-sdk';
import { getMatrixClient } from '../matrixClient';
import { usePaymentVerification } from '../hooks/usePaymentVerification';
import { RoomTimeline } from '../components/room/RoomTimeline';
import { RoomInput } from '../components/room/RoomInput';
import { RoomViewHeader } from '../components/room/RoomViewHeader';
import { AIAssistantModal } from '../components/ai/AIAssistantModal';
import { PaymentModal } from '../components/payment/PaymentModal';
import { AIAssistantProvider } from '../context/AIAssistantContext';

type DirectMessageDetailScreenProps = {
  roomId: string;
  onBack: () => void;
  eventId?: string;
};

export function DirectMessageDetailScreen({
  roomId,
  onBack,
  eventId,
}: DirectMessageDetailScreenProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const mx = getMatrixClient();
  const { paymentState, refreshPaymentStatus } = usePaymentVerification();

  useEffect(() => {
    if (!mx) {
      setLoading(false);
      return;
    }

    const loadRoom = () => {
      const roomObj = mx.getRoom(roomId);
      if (!roomObj) {
        setLoading(false);
        return;
      }

      setRoom(roomObj);
      setLoading(false);
    };

    loadRoom();

    // Listen for room updates
    const onRoomTimeline = (event: MatrixEvent, roomObj: Room | undefined) => {
      if (roomObj?.roomId === roomId) {
        // Force re-render when new events arrive
        setRoom(prevRoom => {
          if (prevRoom?.roomId === roomId) {
            // Return a new reference to trigger re-render
            return mx.getRoom(roomId) || prevRoom;
          }
          return prevRoom;
        });
      }
    };

    const onRoomName = (roomObj: Room) => {
      if (roomObj.roomId === roomId) {
        setRoom(roomObj);
      }
    };

    mx.on(RoomEvent.Timeline, onRoomTimeline);
    mx.on(RoomEvent.Name, onRoomName);

    return () => {
      mx.off(RoomEvent.Timeline, onRoomTimeline);
      mx.off(RoomEvent.Name, onRoomName);
    };
  }, [mx, roomId]);

  const handleAIAssistantClick = useCallback(() => {
    // Ignore for now 
      return;

    console.log('🤖 AI Assistant clicked - Payment state:', {
      hasPaid: paymentState.hasPaid,
      isLoading: paymentState.isLoading,
    });

    if (!paymentState.hasPaid && !paymentState.isLoading) {
      console.log('💳 Payment required - showing payment modal');
      setShowPaymentModal(true);
      return;
    }

    console.log('✅ Payment verified - toggling AI assistant');
    setShowAIAssistant(true);
  }, [paymentState]);

  const handlePaymentSuccess = useCallback(() => {
    console.log('✅ Payment successful - refreshing status');
    refreshPaymentStatus();
    setShowPaymentModal(false);
    setShowAIAssistant(true);
  }, [refreshPaymentStatus]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E4405F" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!room) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Room not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AIAssistantProvider room={room} isMobile={true}>
        <RoomViewHeader
          room={room}
          onBack={onBack}
          onAIAssistantClick={handleAIAssistantClick}
          paymentState={paymentState}
        />

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.timelineContainer}>
            <RoomTimeline room={room} eventId={eventId} />
          </View>

          <View style={styles.inputContainer}>
            <RoomInput room={room} />
          </View>
        </KeyboardAvoidingView>

        {/* AI Assistant Modal */}
        <AIAssistantModal
          visible={showAIAssistant}
          onClose={() => setShowAIAssistant(false)}
          room={room}
        />
      </AIAssistantProvider>

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#E4405F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  timelineContainer: {
    flex: 1,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
});

