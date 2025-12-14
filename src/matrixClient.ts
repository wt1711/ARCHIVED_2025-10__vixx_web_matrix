import 'react-native-get-random-values';

// Polyfill Promise.withResolvers for Hermes (ES2024 feature used by matrix-js-sdk)
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function <T>() {
    let resolve: (value: T | PromiseLike<T>) => void;
    let reject: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve: resolve!, reject: reject! };
  };
}

import { createClient, MatrixClient } from 'matrix-js-sdk';

export type MatrixCredentials = {
  userId: string;
  deviceId: string;
  accessToken: string;
  matrixHost: string;
};

// Singleton state
let matrixClient: MatrixClient | null = null;
let isReady = false;

export const initMatrixClient = async (credentials: MatrixCredentials): Promise<MatrixClient> => {
  // Idempotent check - same credentials, already running
  if (matrixClient) {
    if (matrixClient.getAccessToken() === credentials.accessToken && matrixClient.getUserId() === credentials.userId) {
      console.log('[Matrix] Client already ready');
      return matrixClient;
    }
    // Token mismatch - full restart
    stopMatrixClient();
  }

  // Ensure baseUrl is a full URL
  let baseUrl = credentials.matrixHost;
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }
  // Remove trailing slash if present
  baseUrl = baseUrl.replace(/\/$/, '');

  console.log('[Matrix] Creating client with baseUrl:', baseUrl);
  matrixClient = createClient({
    baseUrl: baseUrl,
    accessToken: credentials.accessToken,
    userId: credentials.userId,
    deviceId: credentials.deviceId,
  });

  console.log('[Matrix] Starting client...');
  await matrixClient.startClient({ initialSyncLimit: 10 });
  isReady = true;
  console.log('[Matrix] Client started and ready');

  return matrixClient;
};

export const getMatrixClient = (): MatrixClient | null => {
  return matrixClient;
};

export const stopMatrixClient = (): void => {
  if (matrixClient) {
    matrixClient.stopClient();
    matrixClient.removeAllListeners();
    matrixClient = null;
    isReady = false;
  }
};

export const getIsReady = (): boolean => {
  return isReady;
};

