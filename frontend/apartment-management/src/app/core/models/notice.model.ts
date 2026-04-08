export type NoticeCategory = 'General' | 'Maintenance' | 'Event' | 'Emergency' | 'Financial' | 'Bylaw';

// Matches backend NoticeResponse DTO
export interface Notice {
  id: string;
  societyId: string;
  title: string;
  content: string;
  category: NoticeCategory;
  postedByUserId: string;
  isArchived: boolean;
  isActive: boolean;
  publishAt: string;
  expiresAt?: string;
  targetApartmentIds: string[];
  createdAt: string;
}

export interface PostNoticeDto {
  userId: string;
  title: string;
  content: string;
  category: NoticeCategory;
  publishAt: string;
  expiresAt?: string;
  targetApartmentIds?: string[];
}
