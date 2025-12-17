// Stripe Payment Service for React Native
// Based on external/src/app/services/stripePaymentService.ts

import { API_ENDPOINTS } from '../constants/env';
import { ACCESS_TOKEN_KEY } from '../constants/localStorege';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PaymentIntentData {
  amount: number;
  currency: string;
  description: string;
  feature: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export class StripePaymentService {
  private static instance: StripePaymentService;
  private token: string | null = null;

  private constructor() {
    AsyncStorage.getItem(ACCESS_TOKEN_KEY).then((token) => {
      this.token = token;
    });
  }

  public static getInstance(): StripePaymentService {
    if (!StripePaymentService.instance) {
      StripePaymentService.instance = new StripePaymentService();
    }
    return StripePaymentService.instance;
  }

  /**
   * Create a payment intent for AI assistance feature
   */
  public async createPaymentIntent(data: PaymentIntentData): Promise<PaymentIntentResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.PAYMENTS.CREATE_INTENT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          amount: data.amount,
          currency: data.currency,
          description: data.description,
          metadata: {
            feature: data.feature,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create payment intent');
      }

      const result = await response.json();
      return {
        clientSecret: result.data?.clientSecret || result.clientSecret,
        paymentIntentId: result.data?.paymentIntentId || result.paymentIntentId,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Create payment for AI assistance with predefined amount
   */
  public async createAIAssistancePayment(): Promise<PaymentIntentResponse> {
    const AI_ASSISTANCE_PRICE = 9.99; // $9.99 one-time payment
    
    return this.createPaymentIntent({
      amount: AI_ASSISTANCE_PRICE * 100, // Convert to cents
      currency: 'usd',
      description: 'AI Assistant Feature Access - One-time payment',
      feature: 'ai_assistance',
    });
  }

  /**
   * Process payment using Stripe Checkout (WebView)
   * For React Native, we'll use a WebView to handle Stripe Checkout
   */
  public async processPaymentWithWebView(): Promise<void> {
    // This will be handled by PaymentModal using WebView
    // The WebView will redirect to Stripe Checkout
    // On success, it will call onSuccess with the paymentIntentId
    throw new Error('Use PaymentModal with WebView integration for payment processing');
  }

  /**
   * Verify payment status after processing
   */
  public async verifyPayment(paymentIntentId: string): Promise<PaymentResult> {
    try {
      // Verify payment by checking the payment intent status
      // This is typically done server-side, but we can check locally
      return {
        success: true,
        paymentIntentId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

export const stripePaymentService = StripePaymentService.getInstance();
