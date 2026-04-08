export interface Visitor {
  id: string;
  societyId: string;
  name: string;
  phone: string;
  purpose: string;
  hostApartmentId: string;
  hostApartmentUnit?: string;
  hostUserId: string;
  hostName?: string;
  vehicleNumber?: string;
  photoUrl?: string;
  passCode?: string;
  status: 'Expected' | 'CheckedIn' | 'CheckedOut';
  checkInAt?: string;
  checkOutAt?: string;
  scheduledAt?: string;
  createdAt: string;
}

export interface RegisterVisitorDto {
  name: string;
  phone: string;
  purpose: string;
  hostApartmentId: string;
  hostUserId: string;
  vehicleNumber?: string;
  scheduledAt?: string;
}
