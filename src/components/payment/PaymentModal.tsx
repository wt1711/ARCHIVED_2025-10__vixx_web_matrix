import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { paymentStorageService } from '../../services/paymentStorageService';

type PaymentModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  matrixUserId?: string;
};

export function PaymentModal({ visible, onClose, onSuccess, matrixUserId }: PaymentModalProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!matrixUserId) {
      setError('Matrix User ID is required');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // In a real implementation, you would integrate with a payment provider
      // For now, this is a placeholder
      // You would typically:
      // 1. Open payment provider (Stripe, PayPal, etc.)
      // 2. Get payment ID after successful payment
      // 3. Call validateAndStorePayment

      // Example flow:
      // const paymentId = await initiatePayment(); // Your payment integration
      // await paymentStorageService.validateAndStorePayment(matrixUserId, paymentId);
      
      // For demo purposes, we'll simulate a successful payment
      setTimeout(() => {
        setProcessing(false);
        onSuccess();
      }, 2000);
    } catch (err) {
      setProcessing(false);
      setError(err instanceof Error ? err.message : 'Payment failed');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Payment Required</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.description}>
              To access AI Assistant features, a payment is required.
            </Text>

            <View style={styles.featuresList}>
              <Text style={styles.featureItem}>✓ AI-powered message suggestions</Text>
              <Text style={styles.featureItem}>✓ Message tone analysis</Text>
              <Text style={styles.featureItem}>✓ Context-aware responses</Text>
              <Text style={styles.featureItem}>✓ Real-time message grading</Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.payButton, processing && styles.payButtonDisabled]}
              onPress={handlePayment}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.payButtonText}>Proceed to Payment</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 24,
  },
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
  },
  payButton: {
    backgroundColor: '#E4405F',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});


