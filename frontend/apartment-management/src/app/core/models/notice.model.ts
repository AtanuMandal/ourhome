export type NoticeCategory = 'General' | 'Maintenance' | 'Event' | 'Emergency' | 'Financial' | 'Bylaw';

export interface Notice {
  id: string;
  societyId: string;
  title: string;
  body: string;
  category: NoticeCategory;
  isArchived: boolean;
  isPinned: boolean;
  postedBy: string;
  postedByName?: string;
  attachmentUrls?: string[];
  publishedAt: string;
  expiresAt?: string;
}

export interface PostNoticeDto {
  title: string;
  body: string;
  category: NoticeCategory;
  isPinned?: boolean;
  postedBy: string;
  expiresAt?: string;
}
