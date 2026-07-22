// Shared pagination wrapper
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Matches backend ResidentApartmentDto — field names shortened to match its compressed JSON keys.
export interface ResidentApartment {
  aid: string; // apartmentId
  nm: string; // name
  rt: 'Owner' | 'Tenant' | 'FamilyMember' | 'CoOccupant' | 'SocietyAdmin'; // residentType
}

export interface CreateHqUserDto {
  fullName: string;
  email: string;
  phone: string;
  role: 'HQAdmin' | 'HQUser';
}

// Matches backend UserResponse/AuthUserDto — field names shortened to match their compressed JSON keys.
export interface User {
  id: string;
  sid: string; // societyId
  nm?: string; // name (AuthUserDto)
  em: string; // email
  ph?: string; // phone
  rl: 'HQAdmin' | 'HQUser' | 'SUAdmin' | 'SUUser' | 'SUSecurity'; // role
  rt: 'SocietyAdmin' | 'Owner' | 'Tenant' | 'FamilyMember' | 'CoOccupant'; // residentType
  aid?: string; // apartmentId
  ac?: boolean; // isActive
  vf: boolean; // isVerified
  perm?: string[]; // permissions (UserResponse only)
  fn?: string; // fullName (UserResponse)
  avatarUrl?: string;
  pic?: string; // profilePictureUrl
  apts?: ResidentApartment[]; // apartments
  paid?: string; // pendingApartmentId
  prt?: string; // pendingResidentType
}

// Matches backend InviteLinkResponse — field names shortened to match its compressed JSON keys.
export interface InviteLink {
  tok: string; // token
  url: string; // inviteUrl
}

// Matches backend ValidateInviteTokenResponse — field names shortened to match its compressed JSON keys.
export interface InviteTokenValidation {
  vl: boolean; // valid
  sid?: string; // societyId
  aid?: string; // apartmentId
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

// Matches backend LoginOptionDto — field names shortened to match its compressed JSON keys.
export interface LoginOption {
  uid: string; // userId
  sid: string; // societyId
  snm: string; // societyName
  aid?: string; // apartmentId
  alb?: string; // apartmentLabel
  rl: string; // role
  rt: string; // residentType
}

// Matches backend LoginResponse — field names shortened to match its compressed JSON keys.
export interface LoginResponse {
  rs: boolean; // requiresSelection
  tok?: string; // token
  usr?: User; // user
  opts: LoginOption[]; // options
}

// Matches backend PasswordResetRequestResponse — field names shortened to match its compressed JSON keys.
export interface PasswordResetRequestResponse {
  rs: boolean; // requiresSelection
  uid?: string; // userId
  opts: LoginOption[]; // options
}

// Matches backend PhoneLoginOtpResponse — field names shortened to match its compressed JSON keys.
export interface PhoneLoginOtpResponse {
  rs: boolean; // requiresSelection
  uid?: string; // userId
  opts: LoginOption[]; // options
}

export type LoginMethod = 'phone' | 'email';
