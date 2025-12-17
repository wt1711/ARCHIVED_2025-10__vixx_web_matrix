import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMatrixClient, getMatrixClient, initMatrixClient, stopMatrixClient } from '../matrixClient';
import { MatrixClient } from 'matrix-js-sdk';
import { ENV } from '../constants/env';
import { MATRIX_CREDENTIALS_KEY } from '../constants/localStorege';

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
  restoreSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [matrixToken, setMatrixToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = async () => {
    try {
      const values = await AsyncStorage.getItem(MATRIX_CREDENTIALS_KEY);
      console.log('values:', values);
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
      setMatrixToken(matrixCredentials.accessToken);
      setUserId(matrixCredentials.userId);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to restore session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Restore session on mount
  useEffect(() => {
    restoreSession();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      // Use Matrix server URL from environment configuration
      const matrixServerUrl = ENV.MATRIX_SERVER_URL;
      
      let matrixClient = getMatrixClient() as MatrixClient;
      if (!matrixClient) {
        matrixClient = await createMatrixClient(matrixServerUrl);
      }
      
      
      // Step 1: Matrix Auth
      const mSession = await matrixClient.login('m.login.password', {
        user: username,
        password,
      });

      // Step 3: Persist - use Matrix server URL from environment
      await AsyncStorage.setItem(MATRIX_CREDENTIALS_KEY, JSON.stringify({
        userId: mSession.user_id,
        deviceId: mSession.device_id,
        accessToken: mSession.access_token,
        matrixHost: matrixServerUrl,
      }));

      // Step 4: Initialize Matrix client
      await initMatrixClient({
        userId: mSession.user_id,
        deviceId: mSession.device_id,
        accessToken: mSession.access_token,
        matrixHost: matrixServerUrl,
      });

      // Step 5: Update State
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

      await AsyncStorage.removeItem(MATRIX_CREDENTIALS_KEY);


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
        restoreSession,
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
