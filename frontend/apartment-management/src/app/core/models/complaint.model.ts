export type ComplaintStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';
export type ComplaintCategory = 'Plumbing' | 'Electrical' | 'Cleaning' | 'Security' | 'Noise' | 'Parking' | 'Other';

export interface Complaint {
  id: string;
  societyId: string;
  apartmentId: string;
  raisedBy: string;
  raisedByName?: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  status: ComplaintStatus;
  assignedTo?: string;
  assignedToName?: string;
  photoUrls?: string[];
  timeline: ComplaintEvent[];
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
}

export interface ComplaintEvent {
  event: string;
  note?: string;
  by: string;
  at: string;
}

export interface RaiseComplaintDto {
  apartmentId: string;
  raisedBy: string;
  category: ComplaintCategory;
  title: string;
  description: string;
}

export interface ResolveComplaintDto {
  resolution: string;
  resolvedBy: string;
}
