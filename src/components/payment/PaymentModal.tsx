import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { stripePaymentService } from '../../services/stripePaymentService';
import { paymentStorageService } from '../../services/paymentStorageService';

type PaymentModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function PaymentModal({ visible, onClose, onSuccess }: PaymentModalProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      // Reset state when modal closes
      setShowWebView(false);
      setCheckoutUrl(null);
      setPaymentIntentId(null);
      setError(null);
    }
  }, [visible]);

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);

    try {

      // Create payment intent
      const { paymentIntentId: intentId } = 
        await stripePaymentService.createAIAssistancePayment();
      
      setPaymentIntentId(intentId);

      // For React Native, we'll use Stripe Checkout in a WebView
      // The backend should provide a checkout URL
      // In a real implementation, your backend should return a checkout session URL
      
      // Alternative: Use Stripe's hosted checkout
      // This requires your backend to create a Checkout Session
      // For now, we'll show a message that payment integration is in progress
      
      setProcessing(false);
      setError('Payment integration: Please implement Stripe Checkout Session creation in your backend API');
      
      // TODO: Once backend provides checkout URL, uncomment:
      // setCheckoutUrl(checkoutSessionUrl);
      // setShowWebView(true);
      
    } catch (err) {
      setProcessing(false);
      setError(err instanceof Error ? err.message : 'Failed to initiate payment');
    }
  };

  const handleWebViewNavigation = (navState: any) => {
    const { url } = navState;
    
    // Check if payment was successful
    if (url.includes('payment-success') || url.includes('success')) {
      handlePaymentSuccess();
    } else if (url.includes('payment-cancel') || url.includes('cancel')) {
      setShowWebView(false);
      setError('Payment was cancelled');
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      if (!paymentIntentId) {
        throw new Error('Payment intent ID is missing');
      }

      // Validate and store payment
      await paymentStorageService.validateAndStorePayment(
        paymentIntentId,
        paymentIntentId // Using paymentIntentId as stripePaymentIntentId
      );

      setShowWebView(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete payment');
    }
  };

  if (showWebView && checkoutUrl) {
    return (
      <Modal
        visible={visible}
        transparent={false}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>Complete Payment</Text>
            <TouchableOpacity onPress={() => setShowWebView(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <WebView
            source={{ uri: checkoutUrl }}
            onNavigationStateChange={handleWebViewNavigation}
            style={styles.webView}
          />
        </View>
      </Modal>
    );
  }

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
              To access AI Assistant features, a one-time payment of $9.99 is required.
            </Text>

            <View style={styles.featuresList}>
              <Text style={styles.featureItem}>✓ AI-powered message suggestions</Text>
              <Text style={styles.featureItem}>✓ Message tone analysis</Text>
              <Text style={styles.featureItem}>✓ Context-aware responses</Text>
              <Text style={styles.featureItem}>✓ Real-time message grading</Text>
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Price:</Text>
              <Text style={styles.price}>$9.99</Text>
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
  webViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  webViewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  webView: {
    flex: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  price: {
    fontSize: 24,
    color: '#E4405F',
    fontWeight: 'bold',
  },
});


