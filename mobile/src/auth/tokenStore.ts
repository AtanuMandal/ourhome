import * as SecureStore from 'expo-secure-store';

const JWT_KEY = 'ourhome_jwt';
const REFRESH_JWT_KEY = 'ourhome_refresh_jwt';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(JWT_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(JWT_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_JWT_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_JWT_KEY, token);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(JWT_KEY),
    SecureStore.deleteItemAsync(REFRESH_JWT_KEY),
  ]);
}
