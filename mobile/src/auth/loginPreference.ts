import * as SecureStore from 'expo-secure-store';

export type LoginMethod = 'phone' | 'email';

const LOGIN_METHOD_KEY = 'ourhome_login_method';

export async function getLoginMethod(): Promise<LoginMethod> {
  const stored = await SecureStore.getItemAsync(LOGIN_METHOD_KEY);
  return stored === 'email' ? 'email' : 'phone';
}

export async function setLoginMethod(method: LoginMethod): Promise<void> {
  await SecureStore.setItemAsync(LOGIN_METHOD_KEY, method);
}
