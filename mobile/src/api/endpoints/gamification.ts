import api from '../client';

export interface PointEvent {
  id: string;
  action: string;
  points: number;
  description?: string;
  earnedAt: string;
}

export interface UserPoints {
  userId: string;
  societyId: string;
  totalPoints: number;
  history: PointEvent[];
}

export const gamificationApi = {
  getUserPoints: (societyId: string, userId: string) =>
    api
      .get<UserPoints>(`/societies/${societyId}/users/${userId}/points`)
      .then((r) => r.data),
};
