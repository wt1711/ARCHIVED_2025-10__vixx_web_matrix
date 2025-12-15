import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMatrixClient, getMatrixClient, initMatrixClient, stopMatrixClient } from '../matrixClient';
import { MatrixClient } from 'matrix-js-sdk';

type MatrixSession = {
  accessToken: string;
  userId: string;
  deviceId?: string;
};

type AuthContextType = {
  token: string | null; // The App Backend Token
  matrixToken: string | null; // The Matrix Token (for WebView)
  userId: string | null; // The Matrix User ID
  matrixSession: MatrixSession | null; // Combined session for WebView injection
  isLoading: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [matrixToken, setMatrixToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const values = await AsyncStorage.getItem('matrixCredentials');
        if (!values) {
          setIsLoading(false);
          return;
        }

        const matrixCredentials = JSON.parse(values);
        if (!matrixCredentials.userId || !matrixCredentials.deviceId || !matrixCredentials.accessToken || !matrixCredentials.matrixHost) {
          setIsLoading(false);
          return;
        }

        await initMatrixClient(matrixCredentials);
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      // Use constant BASE_URL like Expo does - ensures consistent URL handling
      // getHomeserverUrl() might return a malformed URL in React Native, so we use a constant
      const BASE_URL = 'https://matrix.lvbrd.xyz';
      
      let matrixClient = getMatrixClient() as MatrixClient;
      if (!matrixClient) {
        console.log('[Auth] Creating new Matrix client with BASE_URL:', BASE_URL);
        matrixClient = await createMatrixClient(BASE_URL);
      }
      
      console.log('[Auth] Matrix client homeserver URL:', matrixClient.getHomeserverUrl());
      console.log('[Auth] Attempting login for user:', username);
      
      // Step 1: Matrix Auth
      const mSession = await matrixClient.login('m.login.password', {
        user: username,
        password,
      });

      // Step 2: App Auth (mocked for now)
      const appToken = 'mock-app-token';

      // Step 3: Persist - use BASE_URL constant instead of getHomeserverUrl()
      await AsyncStorage.setItem('matrixCredentials', JSON.stringify({
        userId: mSession.user_id,
        deviceId: mSession.device_id,
        accessToken: mSession.access_token,
        matrixHost: BASE_URL, // Use constant instead of getHomeserverUrl()
      }));

      // Step 4: Initialize Matrix client
      await initMatrixClient({
        userId: mSession.user_id,
        deviceId: mSession.device_id,
        accessToken: mSession.access_token,
        matrixHost: BASE_URL, // Use constant instead of getHomeserverUrl()
      });

      // Step 5: Update State
      setToken(appToken);
      setMatrixToken(mSession.access_token);
      setUserId(mSession.user_id);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Stop Matrix client first
      stopMatrixClient();

      await AsyncStorage.removeItem('matrixCredentials');


      setToken(null);
      setMatrixToken(null);
      setUserId(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  // Compute matrixSession for WebView injection
  const matrixSession: MatrixSession | null =
    matrixToken && userId ? { accessToken: matrixToken, userId } : null;

  return (
    <AuthContext.Provider
      value={{
        token,
        matrixToken,
        userId,
        matrixSession,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
