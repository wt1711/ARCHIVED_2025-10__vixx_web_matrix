import { useEffect, useState } from 'react';
import { PaymentStorageService, PaymentStatus } from '../services/paymentStorageService';

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

export const usePaymentVerification = (userId?: string): PaymentVerificationReturn => {
  const [state, setState] = useState<PaymentVerificationState>({
    isLoading: true,
    hasPaid: false,
  });

  const paymentService = PaymentStorageService.getInstance();

  const checkPaymentStatus = async () => {
    return; // TODO: Implement payment verification
    if (!userId) {
      console.log('⚠️ No User ID provided');
      setState(prev => ({ ...prev, isLoading: false, error: 'User ID is required' }));
      return;
    }

    try {
      console.log('🔄 Starting payment status check for user:', userId);
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      console.log('🔍 Checking payment status for user:', userId);
      console.log('🌐 Making request to payment API...');

      const status: PaymentStatus = await paymentService.checkPaymentStatus(userId);
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
    console.log('🔄 refreshPaymentStatus called for user:', userId);
    console.log('📊 Current state before refresh:', state);
    await checkPaymentStatus();
    console.log('📊 State after refresh:', state);
  };

  useEffect(() => {
    console.log('🎯 useEffect triggered - matrixUserId changed to:', userId);
    checkPaymentStatus();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

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
export function useAIAssistancePayment(matrixUserId?: string) {
  return usePaymentVerification(matrixUserId);
}

/**
 * Hook to check if user can access AI assistance features
 */
export function useAIAssistanceAccess(matrixUserId?: string) {
  const paymentVerification = useAIAssistancePayment(matrixUserId);

  return {
    ...paymentVerification,
    canAccessAI: paymentVerification.paymentState.hasPaid,
    requiresPayment: !paymentVerification.paymentState.hasPaid && !paymentVerification.paymentState.isLoading,
  };
}


