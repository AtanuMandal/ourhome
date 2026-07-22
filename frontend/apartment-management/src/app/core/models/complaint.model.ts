export type ComplaintStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed' | 'Rejected';
// Must match backend ComplaintCategory enum — unknown values fail deserialization (400).
// 'Parking' | 'Other' are legacy values kept so previously stored complaints still render.
export type ComplaintCategory = 'Maintenance' | 'Security' | 'Noise' | 'Cleanliness' | 'Infrastructure' | 'General' | 'Parking' | 'Other';
export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Critical';

// Matches backend ComplaintResponse DTO — field names shortened to match its compressed JSON keys.
export interface Complaint {
  id: string;
  tt: string; // title
  ds: string; // description
  cat: ComplaintCategory; // category
  st: ComplaintStatus; // status
  pr: ComplaintPriority; // priority
  ca: string; // createdAt
  ra?: string; // resolvedAt
}

export interface RaiseComplaintDto {
  apartmentId: string;
  userId: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  priority: ComplaintPriority;
  attachmentUrls?: string[];
}

// Matches backend UpdateComplaintStatusCommand — status drives the transition;
// assignedToUserId is required only for the InProgress transition.
export interface ResolveComplaintDto {
  status: ComplaintStatus;
  assignedToUserId?: string;
  notes?: string;
}
