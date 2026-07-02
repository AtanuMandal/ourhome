export type VisitorStatus = 'Pending' | 'Approved' | 'Denied' | 'CheckedIn' | 'CheckedOut';

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
  status: VisitorStatus;
  qrCode?: string;
  passCode: string;
  vehicleNumber?: string;
  approvedAt?: string;
  checkInTime?: string;
  checkOutTime?: string;
  duration?: number;
  createdAt: string;
  validUntil?: string;
  visitorImageUrl?: string;
  isPassExpired?: boolean;
}

export interface RegisterVisitorDto {
  visitorName: string;
  visitorPhone: string;
  visitorEmail?: string;
  purpose: string;
  apartmentId: string;
  companyName?: string;
  vehicleNumber?: string;
  isPreApproved: boolean;
  validityHours?: number;
  visitorImageUrl?: string;
}

export interface VisitorImageUploadResponse {
  fileName: string;
  imageUrl: string;
}

export interface VisitorListFilters {
  apartmentId?: string;
  search?: string;
  residentName?: string;
  status?: VisitorStatus | '';
  fromDate?: string;
  toDate?: string;
}

export interface PublicVisitorPass {
  visitorName: string;
  purpose: string;
  hostBlockName: string;
  hostFlatNumber: string;
  status: VisitorStatus;
  qrCode?: string;
  validUntil?: string;
  isPassExpired: boolean;
  visitorImageUrl?: string;
}

export interface ShareVisitorPassRequest {
  email?: string;
  phone?: string;
}
