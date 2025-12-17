/**
 * Environment Configuration
 * 
 * This file centralizes all environment variables and API endpoints.
 * Uses react-native-config for .env file support with fallback to defaults.
 * 
 * Setup:
 *   1. Copy .env.example to .env
 *   2. Update .env with your values
 *   3. For iOS: Run 'cd ios && pod install' after adding new env vars
 *   4. Rebuild the app
 * 
 * Usage:
 *   import { ENV, API_ENDPOINTS } from '../constants/env';
 *   const apiUrl = ENV.API_BASE_URL;
 *   const loginUrl = API_ENDPOINTS.AUTH.LOGIN;
 */

import Config from 'react-native-config';

// Helper to safely get environment variables from react-native-config
// Falls back to defaults if not set in .env file
const getEnvVar = (key: string, defaultValue: string): string => {
  try {
    // Try to get from react-native-config
    // react-native-config provides typed access via Config object
    const value = (Config as Record<string, string | undefined>)[key];
    if (value && value.trim() !== '') {
      return value;
    } else {
      console.warn(`⚠️ Env var ${key} is empty or not set, using default`);
    }
  } catch (error) {
    // Ignore errors if react-native-config is not properly configured
    // This can happen during development or if .env file is missing
    if (__DEV__) {
      console.warn(`❌ Error getting env var ${key}, using default value:`, error);
    }
  }
  return defaultValue;
};


// API Base URLs
export const ENV = {
  // Main API Base URL (for auth, payments, social accounts)
  API_BASE_URL: getEnvVar('API_BASE_URL', ''),
  
  // Matrix Server URL
  MATRIX_SERVER_URL: getEnvVar('MATRIX_SERVER_URL', ''),
  
  // AI Service Base URL
  AI_SERVICE_BASE_URL: getEnvVar('AI_SERVICE_BASE_URL', ''),

  // Stripe configuration
  STRIPE_PUBLISHABLE_KEY: getEnvVar('STRIPE_PUBLISHABLE_KEY', ''),
  STRIPE_WEBHOOK_SECRET: getEnvVar('STRIPE_WEBHOOK_SECRET', ''),
  
  // Environment
  NODE_ENV: __DEV__ ? 'development' : 'production',
  IS_DEV: __DEV__,
} as const;

// API Endpoints (derived from base URLs)
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: `${ENV.API_BASE_URL}/api/auth/login`,
    STATUS: `${ENV.API_BASE_URL}/api/auth`,
  },
  
  // Social Accounts endpoints
  SOCIAL_ACCOUNTS: {
    BASE: `${ENV.API_BASE_URL}/api/social-accounts`,
    SYNC: `${ENV.API_BASE_URL}/api/social-accounts/sync`,
  },
  
  // Payment endpoints
  PAYMENTS: {
    BASE: `${ENV.API_BASE_URL}/api/payments`,
    STATUS: `${ENV.API_BASE_URL}/api/payments`,
    VALIDATE: `${ENV.API_BASE_URL}/api/payments/payment`,
    CREATE_INTENT: `${ENV.API_BASE_URL}/api/payments/create-intent`,
  },
  
  // Instagram endpoints
  INSTAGRAM: {
    CHECK: `${ENV.API_BASE_URL}/api/instagram`,
    CONNECT: `${ENV.API_BASE_URL}/api/instagram/connect`,
  },
  
  // AI Service endpoints
  AI: {
    SUGGESTION: `${ENV.AI_SERVICE_BASE_URL}/suggestion`,
    GENERATE_RESPONSE: `${ENV.AI_SERVICE_BASE_URL}/generate-response`,
    GRADE_RESPONSE: `${ENV.AI_SERVICE_BASE_URL}/grade-response`,
  },
} as const;

// Type exports for better TypeScript support
export type EnvConfig = typeof ENV;
export type ApiEndpoints = typeof API_ENDPOINTS;
