export type VisitorStatus = 'Pending' | 'Approved' | 'Denied' | 'CheckedIn' | 'CheckedOut';

export interface Visitor {
  id: string;
  societyId: string;
  visitorName: string;
  visitorPhone: string;
  visitorEmail?: string;
  purpose: string;
  hostApartmentId?: string;
  hostApartmentNumber?: string;
  hostUserId?: string;
  hostResidentName?: string;
  status: VisitorStatus;
  qrCode?: string;
  passCode: string;
  vehicleNumber?: string;
  registeredByUserId: string;
  requiresApproval: boolean;
  canApprove: boolean;
  canCheckIn: boolean;
  canCheckOut: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  duration?: number;
  createdAt: string;
}

export interface RegisterVisitorDto {
  visitorName: string;
  visitorPhone: string;
  visitorEmail?: string;
  purpose: string;
  hostApartmentId?: string;
  hostUserId?: string;
  vehicleNumber?: string;
}

export interface VisitorSearchFilters {
  fromDate?: string;
  toDate?: string;
  apartmentId?: string;
  visitorName?: string;
  status?: VisitorStatus | '';
}
