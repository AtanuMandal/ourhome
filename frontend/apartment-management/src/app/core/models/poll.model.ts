export type PollType = 'SingleChoice' | 'MultipleChoice';
export type PollEligibilityUnit = 'PerApartment' | 'PerResident';
export type PollAnonymity = 'Anonymous' | 'Identified';
export type PollVisibility = 'Immediately' | 'AfterClose' | 'AdminOnly';
export type PollStatus = 'Scheduled' | 'Open' | 'Closed';
export type PollOutcome = 'Passed' | 'Failed' | 'NoQuorum';

export interface PollOption {
  id: string;
  text: string;
}

export interface PollOptionTally {
  id: string;
  text: string;
  voteCount: number;
}

export interface Poll {
  id: string;
  societyId: string;
  title: string;
  description: string;
  type: PollType;
  options: PollOption[];
  opensAt: string;
  closesAt: string;
  eligibilityUnit: PollEligibilityUnit;
  anonymity: PollAnonymity;
  visibility: PollVisibility;
  linkedNoticeId?: string;
  quorumThresholdPercent?: number;
  isAgmResolution: boolean;
  allowVoteChange: boolean;
  status: PollStatus;
  closedAt?: string;
  resultsPublished: boolean;
  outcome?: PollOutcome;
  createdByUserId: string;
  createdAt: string;
  tally?: PollOptionTally[];
  eligibleCount?: number;
  participantCount?: number;
  hasVoted: boolean;
  mySelectedOptionIds?: string[];
  agmSessionId?: string;
}

export interface PollSummary {
  id: string;
  title: string;
  type: PollType;
  opensAt: string;
  closesAt: string;
  status: PollStatus;
  isAgmResolution: boolean;
  resultsPublished: boolean;
}

export interface CreatePollDto {
  title: string;
  description: string;
  type: PollType;
  options: string[];
  opensAt: string;
  closesAt: string;
  eligibilityUnit: PollEligibilityUnit;
  anonymity: PollAnonymity;
  visibility: PollVisibility;
  linkedNoticeId?: string;
  quorumThresholdPercent?: number;
  isAgmResolution: boolean;
  allowVoteChange: boolean;
  agmSessionId?: string;
}

export interface CastVoteDto {
  selectedOptionIds: string[];
}

export interface AgmSessionSummary {
  id: string;
  title: string;
  sessionDate: string;
  resolutionCount: number;
}

export interface AgmSessionDetail {
  id: string;
  societyId: string;
  title: string;
  description: string;
  sessionDate: string;
  createdByUserId: string;
  createdAt: string;
  resolutions: Poll[];
}

export interface CreateAgmSessionDto {
  title: string;
  description: string;
  sessionDate: string;
}
