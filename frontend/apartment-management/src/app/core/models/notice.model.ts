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
  isReadByCurrentUser: boolean;
  /** Full name of the poster — always show this instead of the raw user id. */
  postedByName?: string;
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

export interface UpdateNoticeDto {
  title: string;
  content: string;
  expiresAt?: string;
}

export interface NoticeReadReceiptEntry {
  userId: string;
  fullName: string;
}

export interface NoticeReadReceipts {
  read: NoticeReadReceiptEntry[];
  unread: NoticeReadReceiptEntry[];
}
