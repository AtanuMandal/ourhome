export interface Competition {
  id: string;
  societyId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  prizes?: string[];
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  avatarUrl?: string;
  apartmentUnit?: string;
  points: number;
  rank: number;
}

// Matches backend UserPointsResponse DTO — field names shortened to match its compressed JSON keys.
export interface UserPoints {
  tp: number; // totalPoints
  h: PointEvent[]; // history
}

// Matches backend PointHistoryDto DTO — field names shortened to match its compressed JSON keys.
export interface PointEvent {
  pts: number; // points
  rsn: string; // reason
  ca: string; // createdAt
}

export interface AwardPointsDto {
  action: string;
  points: number;
  description?: string;
}

export interface CreateCompetitionDto {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  prizes?: string[];
}
