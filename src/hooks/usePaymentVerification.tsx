import { useEffect, useState } from 'react';
import { PaymentStorageService, PaymentStatusResponse } from '../services/paymentStorageService';

interface PaymentVerificationState {
  isLoading: boolean;
  hasPaid: boolean;
  paymentId?: string;
  error?: string;
}

interface PaymentVerificationReturn {
  paymentState: PaymentVerificationState;
  checkPaymentStatus: () => Promise<void>;
  refreshPaymentStatus: () => Promise<void>;
}

export const usePaymentVerification = (): PaymentVerificationReturn => {
  const [state, setState] = useState<PaymentVerificationState>({
    isLoading: true,
    hasPaid: false,
  });

  const paymentService = PaymentStorageService.getInstance();

  const checkPaymentStatus = async () => {

    try {
      console.log('🔄 Starting payment status check for user');
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      console.log('🔍 Checking payment status for user');
      console.log('🌐 Making request to payment API...');

      const status: PaymentStatusResponse = await paymentService.checkPaymentStatus();
      console.log('💰 Payment status response:', status);

      const newState = {
        isLoading: false,
        hasPaid: status.payed,
        paymentId: status.paymentId,
      };

      console.log('🔄 Setting new payment state:', newState);
      setState(newState);

      console.log('✅ Payment state updated successfully');
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check payment status',
      }));
    }
  };

  const refreshPaymentStatus = async () => {
    console.log('🔄 refreshPaymentStatus called for user');
    console.log('📊 Current state before refresh:', state);
    await checkPaymentStatus();
    console.log('📊 State after refresh:', state);
  };

  useEffect(() => {
    checkPaymentStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Log state changes
  useEffect(() => {
    console.log('📈 Payment state changed:', state);
  }, [state]);

  return {
    paymentState: state,
    checkPaymentStatus,
    refreshPaymentStatus,
  };
};

/**
 * Specific hook for AI assistance payment verification
 */
export function useAIAssistancePayment() {
  return usePaymentVerification();
}

/**
 * Hook to check if user can access AI assistance features
 */
export function useAIAssistanceAccess() {
  const paymentVerification = useAIAssistancePayment();

  return {
    ...paymentVerification,
    canAccessAI: paymentVerification.paymentState.hasPaid,
    requiresPayment: !paymentVerification.paymentState.hasPaid && !paymentVerification.paymentState.isLoading,
  };
}


