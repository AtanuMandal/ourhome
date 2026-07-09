import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CastVoteDto, CreatePollDto, Poll, PollSummary } from '../models/poll.model';

@Injectable({ providedIn: 'root' })
export class PollService {
  private readonly api = inject(ApiService);

  create(societyId: string, dto: CreatePollDto) {
    return this.api.post<Poll>(`societies/${societyId}/polls`, dto);
  }

  list(societyId: string, page = 1, pageSize = 20, linkedNoticeId?: string) {
    return this.api.getPaged<PollSummary>(`societies/${societyId}/polls`, page, pageSize,
      linkedNoticeId ? { linkedNoticeId } : {});
  }

  get(societyId: string, id: string) {
    return this.api.get<Poll>(`societies/${societyId}/polls/${id}`);
  }

  vote(societyId: string, id: string, dto: CastVoteDto) {
    return this.api.post<{ pollId: string; selectedOptionIds: string[]; votedAt: string }>(
      `societies/${societyId}/polls/${id}/vote`, dto);
  }

  close(societyId: string, id: string) {
    return this.api.post<Poll>(`societies/${societyId}/polls/${id}/close`, {});
  }

  publishResults(societyId: string, id: string) {
    return this.api.post<Poll>(`societies/${societyId}/polls/${id}/publish-results`, {});
  }
}
