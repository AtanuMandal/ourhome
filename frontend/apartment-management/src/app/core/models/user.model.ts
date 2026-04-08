// Shared pagination wrapper
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResult<T> {
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface User {
  id: string;
  societyId: string;
  name: string;
  email: string;
  phone?: string;
  role: 'HQAdmin' | 'HQUser' | 'SUAdmin' | 'SUUser';
  apartmentId?: string;
  isVerified: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  societyId: string | null;
}

export interface OtpRequest {
  email: string;
  societyId: string;
}

export interface OtpVerify {
  otp: string;
  societyId: string;
  userId: string;
}

export interface AuthToken {
  accessToken: string;
  expiresIn: number;
  user: User;
}
