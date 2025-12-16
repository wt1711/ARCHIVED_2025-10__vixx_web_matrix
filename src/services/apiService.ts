// Payment storage service using external service database

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ACCESS_TOKEN_KEY, MATRIX_CREDENTIALS_KEY } from "../constants/localStorege";

  
  const BASE_URL = 'https://vixx-be.vercel.app'

  export const SocialAccountType = {
    Instagram: "instagram",
  };
  
  export type SocialAccountTypeType = (typeof SocialAccountType)[keyof typeof SocialAccountType];



  export interface SocialAccount {
    id: string;
    userId: string;
    matrixUserId: string;
    matrixHost: string;
    createdAt: Date;
    updatedAt: Date;
    type: SocialAccountTypeType;
  }
  
  export class AuthService {
    private static instance: AuthService;
    private baseUrl = `${BASE_URL}/api/auth`;
    private accessToken: string | null = null;
  
    private constructor() {
        AsyncStorage.getItem(ACCESS_TOKEN_KEY).then((token) => {
            this.accessToken = token;
        });
    }
  
    public static getInstance(): AuthService {
      if (!AuthService.instance) {
        AuthService.instance = new AuthService();
      }
      return AuthService.instance;
    }
  
    async checkStatus(): Promise<boolean> {
      try {
        const response = await fetch(`${this.baseUrl}`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        });
        if (!response.ok) {
          return false;
        }
        return true;
      } catch (error) {
        console.error('Error checking auth status:', error);
        return false;
      }
    }

    async login(cookies: Record<string, string>): Promise<boolean> {
      try {
        const response = await fetch(`${this.baseUrl}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cookies),
        });
        if (!response.ok) {
          return false;
        }
        const result = await response.json();
        this.accessToken = result.jwtToken;
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, this.accessToken || '');
        await AsyncStorage.setItem(MATRIX_CREDENTIALS_KEY, JSON.stringify({
          userId: result.userId,
          deviceId: result.deviceId,
          accessToken: result.accessToken,
          matrixHost: result.matrixHost,
        }));
        return true;
      } catch (error) {
        console.error('Error logging in:', error);
        return false;
      }
    }
  
  }
  

  export class SocialAccountService {
    private static instance: SocialAccountService;
    private baseUrl = `${BASE_URL}/api/social-accounts`;
    private accessToken: string | null = null;

    private constructor() {
        AsyncStorage.getItem(ACCESS_TOKEN_KEY).then((token) => {
            this.accessToken = token;
        });
    }

    public static getInstance(): SocialAccountService {
      if (!SocialAccountService.instance) {
        SocialAccountService.instance = new SocialAccountService();
      }
      return SocialAccountService.instance;
    }

    async getSocialAccounts(): Promise<SocialAccount[] | null> {
      try {
        const response = await fetch(`${this.baseUrl}`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        });
        if (!response.ok) {
          return null;
        }
        return await response.json();
      } catch (error) {
        console.error('Error checking social account status:', error);
        return null;   
      }
    }

    async syncSocialAccounts(): Promise<boolean> {
      try {
        const response = await fetch(`${this.baseUrl}/sync`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        });
        if (!response.ok) {
          return false;
        }
        return true;
      }
      catch (error) {
        console.error('Error syncing social accounts:', error);
        return false;
      }
    }
  }
