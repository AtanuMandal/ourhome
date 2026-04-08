import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  Competition, LeaderboardEntry, UserPoints,
  AwardPointsDto, CreateCompetitionDto
} from '../models/gamification.model';

@Injectable({ providedIn: 'root' })
export class GamificationService {
  private readonly api = inject(ApiService);

  createCompetition(societyId: string, dto: CreateCompetitionDto) {
    return this.api.post<Competition>(`societies/${societyId}/competitions`, dto);
  }

  joinCompetition(societyId: string, competitionId: string, userId: string) {
    return this.api.post<void>(`societies/${societyId}/competitions/${competitionId}/join`, { userId });
  }

  getLeaderboard(societyId: string, competitionId: string) {
    return this.api.get<LeaderboardEntry[]>(`societies/${societyId}/competitions/${competitionId}/leaderboard`);
  }

  getUserPoints(societyId: string, userId: string) {
    return this.api.get<UserPoints>(`societies/${societyId}/users/${userId}/points`);
  }

  awardPoints(societyId: string, userId: string, dto: AwardPointsDto) {
    return this.api.post<void>(`societies/${societyId}/users/${userId}/points`, dto);
  }
}
