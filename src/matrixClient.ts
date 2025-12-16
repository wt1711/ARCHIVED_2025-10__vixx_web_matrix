// Polyfills are now imported in index.js before this module loads
// No need to import them here again

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

const fixUrlString = (urlString: string): string => {
  // Remove trailing slashes from pathname, but preserve query params and fragments
  // Match: /path/to/resource/ -> /path/to/resource
  // Match: /path/to/resource/// -> /path/to/resource
  // Match: /path/to/resource/?query -> /path/to/resource?query
  // Match: /path/to/resource/#fragment -> /path/to/resource#fragment
  // This regex removes one or more trailing slashes before ?, #, or end of string
  const allowedTrailingList: string[] = ['pushrules'];
  const fixedUrlString = urlString.replace(/\/+(\?|#|$)/g, '$1');
  const fixedPath = fixedUrlString.split('?')[0];
  if (allowedTrailingList.some(trailing => fixedPath.endsWith(trailing))) {
      return urlString;
  }
  return fixedUrlString;
}

const fetchFn = (
  url: string | URL | Request,
  options?: RequestInit,
): Promise<Response> => {
  let fixedUrl: string | Request;

  if (typeof url === 'string') {
    // Remove trailing slash from string URL pathname
    fixedUrl = fixUrlString(url);
  } else if (url instanceof URL) {
    // Convert to string and fix it
    const urlString = url.toString();
    fixedUrl = fixUrlString(urlString);
  } else if (url instanceof Request) {
    // Create a new Request with fixed URL
    const requestUrl = fixUrlString(url.url);
    // Merge options from the original request with new options
    const mergedOptions: RequestInit = {
      method: url.method,
      headers: url.headers,
      mode: url.mode,
      credentials: url.credentials,
      referrer: url.referrer,
      signal: url.signal,
      ...options,
    };
    fixedUrl = new Request(requestUrl, mergedOptions);
  } else {
    // Fallback to original
    fixedUrl = url as string;
  }

  return fetch(fixedUrl, options);
}

export const createMatrixClient = async (baseUrl: string): Promise<MatrixClient> => {
  // Match Expo pattern - use baseUrl directly without normalization
  // matrix-js-sdk handles URL construction internally
  console.log('[Matrix] Creating client with baseUrl:', baseUrl);
  return createClient({
    baseUrl: baseUrl,
    fetchFn: fetchFn,
  });
};

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
    fetchFn: fetchFn,
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

