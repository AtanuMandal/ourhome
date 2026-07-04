export type UserRole = 'HQAdmin' | 'HQUser' | 'SUAdmin' | 'SUUser' | 'SUSecurity';
export type ResidentType = 'Owner' | 'Tenant' | 'CoOccupant' | 'FamilyMember' | 'SocietyAdmin';

// Matches backend ResidentApartmentDto — name is the formatted display label
export interface ResidentApartmentInfo {
  apartmentId: string;
  name: string;
  residentType: string;
}

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
  // Populated from UserResponse.Apartments — contains formatted display labels
  apartments?: ResidentApartmentInfo[];
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

// Matches backend VisitorResponse
export interface Visitor {
  id: string;
  societyId: string;
  visitorName: string;
  visitorPhone: string;
  visitorEmail?: string;
  companyName?: string;
  purpose: string;
  hostApartmentId: string;
  hostResidentName: string;
  hostBlockName: string;
  hostFloorNumber: number;
  hostFlatNumber: string;
  isPreApproved: boolean;
  status: string;
  passCode: string;
  qrCode?: string;
  vehicleNumber?: string;
  checkInTime?: string;
  checkOutTime?: string;
  duration?: number;
  createdAt: string;
  validUntil?: string;
  visitorImageUrl?: string;
  isPassExpired: boolean;
}

// Matches backend NoticeResponse
export interface Notice {
  id: string;
  societyId: string;
  title: string;
  content: string;
  category: string;
  postedByUserId: string;
  isArchived: boolean;
  publishAt: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  targetApartmentIds: string[];
  isReadByCurrentUser: boolean;
}

// Matches backend ComplaintResponse
export interface Complaint {
  id: string;
  societyId: string;
  apartmentId: string;
  raisedByUserId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  assignedToUserId?: string;
  attachmentUrls: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  feedbackRating?: number;
  feedbackComment?: string;
}

// Matches backend MaintenanceChargeDto
export interface MaintenanceCharge {
  id: string;
  societyId: string;
  apartmentId: string;
  apartmentNumber: string;
  scheduleId: string;
  scheduleName: string;
  chargeYear: number;
  chargeMonth: number;
  amount: number;
  status: string;
  dueDate: string;
  isOverdue: boolean;
  paidAt?: string;
  paymentMethod?: string;
  transactionReference?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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
  rules: string;
  isActive: boolean;
  bookingSlotMinutes: number;
  operatingStart: string;
  operatingEnd: string;
  advanceBookingDays: number;
}

// Matches backend BookingResponse
export interface AmenityBooking {
  id: string;
  societyId: string;
  amenityId: string;
  amenityName: string;
  bookedByUserId: string;
  bookedByApartmentId: string;
  startTime: string;
  endTime: string;
  status: string;
  adminNotes?: string;
  duration: number;
  createdAt: string;
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
