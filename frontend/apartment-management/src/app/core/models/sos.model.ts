export type SosCategory = 'Fire' | 'Medical' | 'SecurityIntrusion' | 'Other';
export type SosAlertStatus = 'Triggered' | 'Acknowledged' | 'Resolved' | 'FalseAlarm';

export interface SosAlert {
  id: string;
  societyId: string;
  apartmentId: string;
  apartmentLabel: string;
  triggeredByUserId: string;
  triggeredByUserName: string;
  category: SosCategory;
  note?: string;
  status: SosAlertStatus;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedByUserId?: string;
  acknowledgedByUserName?: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  resolvedByUserName?: string;
  escalationCount: number;
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

export interface SosCategoryBreakdown {
  category: SosCategory;
  count: number;
}

export interface SosAlertReport {
  fromDate: string;
  toDate: string;
  totalAlerts: number;
  falseAlarmCount: number;
  falseAlarmRatePercent: number;
  averageAcknowledgeSeconds?: number;
  averageResolveSeconds?: number;
  byCategory: SosCategoryBreakdown[];
}

export const SOS_CATEGORY_LABELS: Record<SosCategory, string> = {
  Fire: 'Fire',
  Medical: 'Medical',
  SecurityIntrusion: 'Security / Intrusion',
  Other: 'Other',
};
