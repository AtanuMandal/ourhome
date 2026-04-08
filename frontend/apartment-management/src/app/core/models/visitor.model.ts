// Matches backend VisitorResponse / VisitorLogDto
export interface Visitor {
  id: string;
  societyId: string;
  visitorName: string;
  visitorPhone: string;
  visitorEmail?: string;
  purpose: string;
  hostApartmentId: string;
  hostUserId: string;
  status: 'Expected' | 'CheckedIn' | 'CheckedOut';
  qrCode?: string;
  passCode: string;
  vehicleNumber?: string;
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
  hostApartmentId: string;
  hostUserId: string;
  vehicleNumber?: string;
}
