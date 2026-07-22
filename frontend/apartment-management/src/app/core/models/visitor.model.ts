export type VisitorStatus = 'Pending' | 'Approved' | 'Denied' | 'CheckedIn' | 'CheckedOut';

// Field names are shortened to match the backend's compressed JSON keys (see VisitorResponse).
export interface Visitor {
  id: string;
  vn: string; // visitorName
  vp: string; // visitorPhone
  ve?: string; // visitorEmail
  cn?: string; // companyName
  pu: string; // purpose
  aid: string; // hostApartmentId
  hrn: string; // hostResidentName
  hbn: string; // hostBlockName
  hfn: number; // hostFloorNumber
  hft: string; // hostFlatNumber
  ipa: boolean; // isPreApproved
  st: VisitorStatus; // status
  qr?: string; // qrCode
  pc: string; // passCode
  vh?: string; // vehicleNumber
  cit?: string; // checkInTime
  cot?: string; // checkOutTime
  ca: string; // createdAt
  vu?: string; // validUntil
  img?: string; // visitorImageUrl
  ipe?: boolean; // isPassExpired
  /** Checked in past the society's overstay threshold — render in red. */
  ov?: boolean; // isOverstay
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
  vn: string; // visitorName
  pu: string; // purpose
  hbn: string; // hostBlockName
  hft: string; // hostFlatNumber
  st: VisitorStatus; // status
  qr?: string; // qrCode
  vu?: string; // validUntil
  ipe: boolean; // isPassExpired
  img?: string; // visitorImageUrl
}

export interface ShareVisitorPassRequest {
  email?: string;
  phone?: string;
}
