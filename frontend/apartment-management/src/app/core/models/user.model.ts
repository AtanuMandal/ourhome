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

export interface ResidentApartment {
  apartmentId: string;
  name: string;
  residentType: 'Owner' | 'Tenant' | 'FamilyMember' | 'CoOccupant' | 'SocietyAdmin';
}

export interface User {
  id: string;
  societyId: string;
  name?: string;
  email: string;
  phone?: string;
  role: 'HQAdmin' | 'HQUser' | 'SUAdmin' | 'SUUser' | 'SUSecurity';
  residentType: 'SocietyAdmin' | 'Owner' | 'Tenant' | 'FamilyMember' | 'CoOccupant';
  apartmentId?: string;
  isActive?: boolean;
  isVerified: boolean;
  hasPassword?: boolean;
  permissions: string[];
  fullName?: string;
  avatarUrl?: string;
  apartments?: ResidentApartment[];
  createdAt?: string;
  pendingApartmentId?: string;
  pendingResidentType?: string;
}

export interface InviteLink {
  token: string;
  inviteUrl: string;
}

export interface InviteTokenValidation {
  valid: boolean;
  societyId?: string;
  apartmentId?: string;
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

export interface LoginOption {
  userId: string;
  societyId: string;
  societyName: string;
  apartmentId?: string;
  apartmentLabel?: string;
  role: string;
  residentType: string;
}

export interface LoginResponse {
  requiresSelection: boolean;
  token?: string;
  user?: User;
  options: LoginOption[];
}

export interface PasswordResetRequestResponse {
  requiresSelection: boolean;
  userId?: string;
  options: LoginOption[];
}

export interface PhoneLoginOtpResponse {
  requiresSelection: boolean;
  userId?: string;
  options: LoginOption[];
}

export type LoginMethod = 'phone' | 'email';
