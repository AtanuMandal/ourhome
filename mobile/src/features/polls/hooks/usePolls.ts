import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { pollApi, CreatePollRequest, CastVoteRequest } from '../../../api/endpoints/poll';
import type { PollSummary } from '../../../api/types';

export function usePollList(societyId: string) {
  return useInfiniteList<PollSummary>({
    queryKey: ['polls', societyId],
    fetchPage: (page) => pollApi.getPolls(societyId, { page, pageSize: 50 }),
    enabled: !!societyId,
  });
}

export function usePoll(societyId: string, id: string) {
  return useQuery({
    queryKey: ['poll', societyId, id],
    queryFn: () => pollApi.getPoll(societyId, id),
    enabled: !!societyId && !!id,
  });
}

/** Looks up the poll surfaced from a given notice (requirements/polls_and_voting.md — Linked Notice). */
export function usePollsByLinkedNotice(societyId: string, noticeId: string) {
  return useQuery({
    queryKey: ['polls-by-notice', societyId, noticeId],
    queryFn: () => pollApi.getPolls(societyId, { linkedNoticeId: noticeId, page: 1, pageSize: 1 }),
    enabled: !!societyId && !!noticeId,
  });
}

function invalidatePollQueries(queryClient: ReturnType<typeof useQueryClient>, societyId: string, pollId?: string) {
  void queryClient.invalidateQueries({ queryKey: ['polls', societyId] });
  if (pollId) void queryClient.invalidateQueries({ queryKey: ['poll', societyId, pollId] });
}

export function useCreatePoll(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePollRequest) => pollApi.create(societyId, data),
    onSuccess: () => invalidatePollQueries(queryClient, societyId),
  });
}

export function useCastVote(societyId: string, pollId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CastVoteRequest) => pollApi.vote(societyId, pollId, data),
    onSuccess: () => invalidatePollQueries(queryClient, societyId, pollId),
  });
}

export function useClosePoll(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pollId: string) => pollApi.close(societyId, pollId),
    onSuccess: (_data, pollId) => invalidatePollQueries(queryClient, societyId, pollId),
  });
}

export function usePublishPollResults(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pollId: string) => pollApi.publishResults(societyId, pollId),
    onSuccess: (_data, pollId) => invalidatePollQueries(queryClient, societyId, pollId),
  });
}
