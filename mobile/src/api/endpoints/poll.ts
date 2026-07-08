import api from '../client';
import type {
  PaginatedResponse,
  Poll,
  PollAnonymity,
  PollEligibilityUnit,
  PollSummary,
  PollTargetAudience,
  PollType,
  PollVisibility,
  PollVoteResult,
} from '../types';

export interface CreatePollRequest {
  title: string;
  description: string;
  type: PollType;
  options: string[];
  opensAt: string;
  closesAt: string;
  targetAudience: PollTargetAudience;
  targetBlockNames?: string[];
  eligibilityUnit: PollEligibilityUnit;
  anonymity: PollAnonymity;
  visibility: PollVisibility;
  linkedNoticeId?: string;
  quorumThresholdPercent?: number;
  isAgmResolution: boolean;
  allowVoteChange: boolean;
  agmSessionId?: string;
}

export interface CastVoteRequest {
  selectedOptionIds: string[];
}

export const pollApi = {
  create: (societyId: string, data: CreatePollRequest) =>
    api.post<Poll>(`/societies/${societyId}/polls`, data).then((r) => r.data),

  getPolls: (societyId: string, params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<PollSummary>>(`/societies/${societyId}/polls`, { params }).then((r) => r.data),

  getPoll: (societyId: string, id: string) =>
    api.get<Poll>(`/societies/${societyId}/polls/${id}`).then((r) => r.data),

  vote: (societyId: string, id: string, data: CastVoteRequest) =>
    api.post<PollVoteResult>(`/societies/${societyId}/polls/${id}/vote`, data).then((r) => r.data),

  close: (societyId: string, id: string) =>
    api.post<Poll>(`/societies/${societyId}/polls/${id}/close`).then((r) => r.data),

  publishResults: (societyId: string, id: string) =>
    api.post<Poll>(`/societies/${societyId}/polls/${id}/publish-results`).then((r) => r.data),
};
