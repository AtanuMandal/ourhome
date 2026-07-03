export type UserRole = 'HQAdmin' | 'HQUser' | 'SUAdmin' | 'SUUser' | 'SUSecurity';
export type ResidentType = 'Owner' | 'Tenant' | 'CoOccupant' | 'FamilyMember' | 'SocietyAdmin';

export interface User {
  id: string;
  societyId: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  residentType: ResidentType;
  apartmentId?: string;
  isVerified: boolean;
  isActive: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  selectedUserId?: string;
}

// Matches backend ApplicationDtos.AuthUserDto (field "name" not "fullName")
export interface AuthUserDto {
  id: string;
  societyId: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  residentType: string;
  apartmentId: string | null;
  isVerified: boolean;
  permissions: string[];
}

export interface LoginOptionDto {
  userId: string;
  societyId: string;
  societyName: string;
  apartmentId: string | null;
  apartmentLabel: string | null;
  role: UserRole;
  residentType: string;
}

// Matches backend ApplicationDtos.LoginResponse
export interface LoginResponse {
  requiresSelection: boolean;
  token: string | null;
  user: AuthUserDto | null;
  options: LoginOptionDto[];
}

export interface Visitor {
  id: string;
  societyId: string;
  residentId: string;
  residentName: string;
  visitorName: string;
  visitorPhone: string;
  purpose: string;
  photoUrl?: string;
  status: string;
  checkInAt?: string;
  checkOutAt?: string;
  createdAt: string;
}

export interface Notice {
  id: string;
  societyId: string;
  title: string;
  content: string;
  postedBy: string;
  postedAt: string;
  isRead?: boolean;
  attachmentUrl?: string;
}

export interface Complaint {
  id: string;
  societyId: string;
  residentId: string;
  residentName: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
}

export interface MaintenanceCharge {
  id: string;
  societyId: string;
  apartmentId: string;
  apartmentNumber: string;
  amount: number;
  month: string;
  year: number;
  status: string;
  dueDate: string;
  paidAt?: string;
  paymentProofUrl?: string;
}

export interface ApartmentResident {
  userId: string;
  userName: string;
  residentType: ResidentType;
}

export interface Apartment {
  id: string;
  societyId: string;
  apartmentNumber: string;
  blockName: string;
  floorNumber: number;
  status: string;
  residents: ApartmentResident[];
}

export interface Amenity {
  id: string;
  societyId: string;
  name: string;
  description: string;
  capacity: number;
  isActive: boolean;
}

export interface AmenityBooking {
  id: string;
  amenityId: string;
  amenityName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  error: string;
  details?: string;
}
