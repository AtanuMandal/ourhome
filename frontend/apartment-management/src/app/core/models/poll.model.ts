export type PollType = 'SingleChoice' | 'MultipleChoice';
export type PollTargetAudience = 'FullSociety' | 'PerBlock' | 'MultipleBlock';
export type PollEligibilityUnit = 'PerApartment' | 'PerResident';
export type PollAnonymity = 'Anonymous' | 'Identified';
export type PollVisibility = 'Immediately' | 'AfterClose' | 'AdminOnly';
export type PollStatus = 'Scheduled' | 'Open' | 'Closed';
export type PollOutcome = 'Passed' | 'Failed' | 'NoQuorum';

export interface PollOption {
  id: string;
  tx: string; // text
}

export interface PollOptionTally {
  id: string;
  tx: string; // text
  vc: number; // voteCount
}

// Matches backend PollResponse DTO — field names shortened to match its compressed JSON keys.
export interface Poll {
  id: string;
  tt: string; // title
  ds: string; // description
  ty: PollType; // type
  op: PollOption[]; // options
  oa: string; // opensAt
  ca: string; // closesAt
  ta: PollTargetAudience; // targetAudience
  tbn: string[]; // targetBlockNames
  agm: boolean; // isAgmResolution
  avc: boolean; // allowVoteChange
  st: PollStatus; // status
  rp: boolean; // resultsPublished
  oc?: PollOutcome; // outcome
  tl?: PollOptionTally[]; // tally
  elc?: number; // eligibleCount
  pc?: number; // participantCount
  hv: boolean; // hasVoted
  mso?: string[]; // mySelectedOptionIds
}

// Matches backend PollSummaryResponse DTO — field names shortened to match its compressed JSON keys.
export interface PollSummary {
  id: string;
  tt: string; // title
  ty: PollType; // type
  ca: string; // closesAt
  st: PollStatus; // status
  agm: boolean; // isAgmResolution
}

export interface CreatePollDto {
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

export interface CastVoteDto {
  selectedOptionIds: string[];
}

// Matches backend AgmSessionSummaryResponse DTO — field names shortened to match its compressed JSON keys.
export interface AgmSessionSummary {
  id: string;
  tt: string; // title
  sd: string; // sessionDate
  rc: number; // resolutionCount
}

// Matches backend AgmSessionDetailResponse DTO — field names shortened to match its compressed JSON keys.
export interface AgmSessionDetail {
  id: string;
  tt: string; // title
  ds: string; // description
  sd: string; // sessionDate
  r: Poll[]; // resolutions
}

export interface CreateAgmSessionDto {
  title: string;
  description: string;
  sessionDate: string;
}
