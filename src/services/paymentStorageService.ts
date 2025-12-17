// Payment storage service using external service database

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../constants/env';
import { ACCESS_TOKEN_KEY } from '../constants/localStorege';

export enum PaymentStatus {
  Pending = "pending",
  Completed = "completed",
  Failed = "failed",
  Cancelled = "cancelled",
}

export type PaymentStatusType = (typeof PaymentStatus)[keyof typeof PaymentStatus];
export interface PaymentStatusResponse {
  payed: boolean;
  paymentId?: string;
}

export class PaymentStorageService {
  private static instance: PaymentStorageService;
  private token: string | null = null;

  private constructor() {
    AsyncStorage.getItem(ACCESS_TOKEN_KEY).then((token) => {
      this.token = token;
    });
  }

  public static getInstance(): PaymentStorageService {
    if (!PaymentStorageService.instance) {
      PaymentStorageService.instance = new PaymentStorageService();
    }
    return PaymentStorageService.instance;
  }

  async checkPaymentStatus(): Promise<PaymentStatusResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.PAYMENTS.STATUS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });
      if (!response.ok) {
        const error = await response.text();
        console.log(this.token);
        console.info('Error checking payment status:', error);
        return { payed: false, paymentId: undefined };
      }
      const responseData = await response.json();
      const payments = responseData.data?.payments || [];
      const payed = payments.some((payment: any) => payment.status === PaymentStatus.Completed);
      const completedPayment = payments.find((payment: any) => payment.status === PaymentStatus.Completed);
      return { 
        payed, 
        paymentId: completedPayment?.paymentId as string | undefined 
      };
    } catch (error) {
      console.info('Error checking payment status:', error);
      return { payed: false, paymentId: undefined };
    }
  }

  async validateAndStorePayment(paymentId: string, stripePaymentIntentId: string): Promise<{ success: boolean; message?: string }> {
    try {
      
      // First, check if payment is already stored to avoid duplicate processing
      const existingPayment = await this.checkPaymentStatus();
      if (existingPayment.payed && existingPayment.paymentId === paymentId) {
        console.log('Payment already processed and stored:', paymentId);
        return { success: true, message: 'Payment already processed' };
      }
      
      const response = await fetch(API_ENDPOINTS.PAYMENTS.VALIDATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({
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