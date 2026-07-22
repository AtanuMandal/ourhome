export type NoticeCategory = 'General' | 'Maintenance' | 'Event' | 'Emergency' | 'Financial' | 'Bylaw';

// Matches backend NoticeResponse DTO — field names shortened to match its compressed JSON keys.
export interface Notice {
  id: string;
  tt: string; // title
  ct: string; // content
  cat: NoticeCategory; // category
  pid: string; // postedByUserId
  pa: string; // publishAt
  ea?: string; // expiresAt
  rd: boolean; // isReadByCurrentUser
  /** Full name of the poster — always show this instead of the raw user id. */
  pn?: string; // postedByName
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
