import api from '../client';
import type { LoginRequest, LoginResponse, AuthUserDto } from '../types';

export interface PasswordResetOption {
  uid: string; // userId
  sid: string; // societyId
  snm: string; // societyName
  rl: string; // role
  alb: string | null; // apartmentLabel
}

// Matches backend PasswordResetRequestResponse — field names shortened to match its compressed JSON keys.
export interface PasswordResetRequestResponse {
  rs: boolean; // requiresSelection
  opts: PasswordResetOption[]; // options
}

// Matches backend PhoneLoginOtpResponse — field names shortened to match its compressed JSON keys.
export interface PhoneLoginOtpResponse {
  rs: boolean; // requiresSelection
  uid: string | null; // userId
  opts: PasswordResetOption[]; // options
}

// Matches backend VerifyOtpResponse — field names shortened to match its compressed JSON keys.
export interface VerifyOtpLoginResponse {
  tok: string; // accessToken
  usr: AuthUserDto; // user
}

export interface ConfirmPasswordResetRequest {
  userId: string;
  societyId: string;
  otpCode: string;
  newPassword: string;
}

export interface SelfRegisterRequest {
  inviteToken: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data).then((r) => r.data),

  requestOtpLogin: (phone: string, selectedUserId?: string) =>
    api.post<PhoneLoginOtpResponse>('/auth/otp-login/request', { phone, selectedUserId }).then((r) => r.data),

  verifyOtpLogin: (societyId: string, userId: string, otpCode: string) =>
    api.post<VerifyOtpLoginResponse>(`/societies/${societyId}/users/${userId}/verify-otp`, { otpCode }).then((r) => r.data),

  requestPasswordReset: (email: string) =>
    api.post<PasswordResetRequestResponse>('/auth/password-reset/request', { email }).then((r) => r.data),

  confirmPasswordReset: (data: ConfirmPasswordResetRequest) =>
    api.post('/auth/password-reset/confirm', data).then((r) => r.data),

  selfRegister: (data: SelfRegisterRequest) =>
    api.post('/auth/register', data).then((r) => r.data),

  validateInvite: (token: string) =>
    api.get<{ isValid: boolean; societyName: string; email: string }>(`/auth/invite/${token}`).then((r) => r.data),
};
