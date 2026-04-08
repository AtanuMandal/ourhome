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

export interface UserPoints {
  userId: string;
  societyId: string;
  totalPoints: number;
  history: PointEvent[];
}

export interface PointEvent {
  id: string;
  action: string;
  points: number;
  description?: string;
  earnedAt: string;
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
