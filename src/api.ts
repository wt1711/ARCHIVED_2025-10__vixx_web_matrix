import { API_ENDPOINTS } from './constants/env';

type LoginResponse = {
  message: string;
  userId?: string;
  deviceId?: string;
  accessToken?: string;
  matrixHost?: string;
  user: { 
    username: string; 
    accessToken: string;
  };
};

export async function apiLogin(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function apiCheckInstagram(token: string): Promise<{ isInstagramConnected: boolean }> {
  const res = await fetch(API_ENDPOINTS.INSTAGRAM.CHECK, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Check failed: ${res.status} ${text}`);
  }
  return res.json();
}

export type InstagramConnectPayload = {
  rur: string;
  ps_n: string;
  ps_l: string;
  ds_user_id: string;
  mid: string;
  ig_did: string;
  sessionid: string;
  datr: string;
  dpr: string;
  wd: string;
  csrftoken: string;
};

export async function apiConnectInstagram(token: string, payload: InstagramConnectPayload): Promise<{ success: boolean; message: string }> {
  const res = await fetch(API_ENDPOINTS.INSTAGRAM.CONNECT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Connect failed: ${res.status} ${text}`);
  }
  return res.json();
}