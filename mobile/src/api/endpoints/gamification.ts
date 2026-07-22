import api from '../client';

// Matches backend PointHistoryDto — field names shortened to match its compressed JSON keys.
export interface PointEvent {
  pts: number; // points
  rsn: string; // reason
  ca: string; // createdAt
}

// Matches backend UserPointsResponse — field names shortened to match its compressed JSON keys.
export interface UserPoints {
  tp: number; // totalPoints
  h: PointEvent[]; // history
}

export const gamificationApi = {
  getUserPoints: (societyId: string, userId: string) =>
    api
      .get<UserPoints>(`/societies/${societyId}/users/${userId}/points`)
      .then((r) => r.data),
};
