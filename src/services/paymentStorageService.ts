// Payment storage service using external service database

export interface PaymentStatus {
  payed: boolean;
  paymentId?: string;
}

const BASE_URL = 'https://vixx-be.vercel.app'

export class PaymentStorageService {
  private static instance: PaymentStorageService;
  private baseUrl = `${BASE_URL}/api/payments`;

  private constructor() {}

  public static getInstance(): PaymentStorageService {
    if (!PaymentStorageService.instance) {
      PaymentStorageService.instance = new PaymentStorageService();
    }
    return PaymentStorageService.instance;
  }

  async checkPaymentStatus(userId: string): Promise<PaymentStatus> {
    try {
      const response = await fetch(`${this.baseUrl}?userId=${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking payment status:', error);
      throw error;
    }
  }

  async validateAndStorePayment(userId: string, paymentId: string, stripePaymentIntentId: string): Promise<{ success: boolean; message?: string }> {
    try {
      
      // First, check if payment is already stored to avoid duplicate processing
      const existingPayment = await this.checkPaymentStatus(userId);
      if (existingPayment.payed && existingPayment.paymentId === paymentId) {
        console.log('Payment already processed and stored:', paymentId);
        return { success: true, message: 'Payment already processed' };
      }
      
      const response = await fetch(`${this.baseUrl}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          stripePaymentIntentId,
          paymentId,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        // If it's a duplicate payment error, treat it as success
        if (response.status === 409 || (result.error && result.error.includes('already exists'))) {
          console.log('Payment already exists in database:', paymentId);
          return { success: true, message: 'Payment already processed' };
        }
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('Error validating and storing payment:', error);
      throw error;
    }
  }
}

export const paymentStorageService = PaymentStorageService.getInstance();