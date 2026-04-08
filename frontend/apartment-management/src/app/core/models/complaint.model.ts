export type ComplaintStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';
export type ComplaintCategory = 'Plumbing' | 'Electrical' | 'Cleaning' | 'Security' | 'Noise' | 'Parking' | 'Other';
export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Critical';

// Matches backend ComplaintResponse DTO
export interface Complaint {
  id: string;
  societyId: string;
  apartmentId: string;
  raisedByUserId: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assignedToUserId?: string;
  attachmentUrls: string[];
  resolvedAt?: string;
  feedbackRating?: number;
  feedbackComment?: string;
  createdAt: string;
  updatedAt?: string;
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

export interface ResolveComplaintDto {
  resolutionNotes: string;
}
