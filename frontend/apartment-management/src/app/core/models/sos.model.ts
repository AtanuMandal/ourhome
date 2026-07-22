export type SosCategory = 'Fire' | 'Medical' | 'SecurityIntrusion' | 'Other';
export type SosAlertStatus = 'Triggered' | 'Acknowledged' | 'Resolved' | 'FalseAlarm';

// Matches backend SosAlertResponse DTO — field names shortened to match its compressed JSON keys.
export interface SosAlert {
  id: string;
  al: string; // apartmentLabel
  un: string; // triggeredByUserName
  cat: SosCategory; // category
  nt?: string; // note
  st: SosAlertStatus; // status
  ta: string; // triggeredAt
  aun?: string; // acknowledgedByUserName
  run?: string; // resolvedByUserName
  ec: number; // escalationCount
}

export interface TriggerSosAlertDto {
  category: SosCategory;
  note?: string;
}

export interface SosAlertListFilters {
  status?: SosAlertStatus | '';
  category?: SosCategory | '';
  fromDate?: string;
  toDate?: string;
}

// Matches backend SosCategoryBreakdown DTO — field names shortened to match its compressed JSON keys.
export interface SosCategoryBreakdown {
  cat: SosCategory; // category
  ct: number; // count
}

// Matches backend SosAlertReportResponse DTO — field names shortened to match its compressed JSON keys.
export interface SosAlertReport {
  ta: number; // totalAlerts
  fr: number; // falseAlarmRatePercent
  aa?: number; // averageAcknowledgeSeconds
  ar?: number; // averageResolveSeconds
  bc: SosCategoryBreakdown[]; // byCategory
}

export const SOS_CATEGORY_LABELS: Record<SosCategory, string> = {
  Fire: 'Fire',
  Medical: 'Medical',
  SecurityIntrusion: 'Security / Intrusion',
  Other: 'Other',
};
