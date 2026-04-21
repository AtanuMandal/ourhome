import { Apartment, formatApartmentLabel } from '../../core/models/apartment.model';
import {
  MaintenanceAreaBasis,
  MaintenanceCharge,
  MaintenanceChargeStatus,
  MaintenanceFrequency,
  MaintenancePricingType,
} from '../../core/models/maintenance.model';

export interface ChargeSection {
  key: string;
  label: string;
  charges: MaintenanceCharge[];
  totalAmount: number;
}

export type ScheduleScope = 'Society' | 'Apartment';

export interface SelectOption<T> {
  value: T;
  label: string;
}

export const SCOPE_OPTIONS: SelectOption<ScheduleScope>[] = [
  { value: 'Society', label: 'Entire society' },
  { value: 'Apartment', label: 'Specific apartment' },
];

export const PRICING_TYPE_OPTIONS: SelectOption<MaintenancePricingType>[] = [
  { value: 'FixedAmount', label: 'Fixed amount' },
  { value: 'PerSquareFoot', label: 'Per sq. ft.' },
];

export const AREA_BASIS_OPTIONS: SelectOption<MaintenanceAreaBasis>[] = [
  { value: 'CarpetArea', label: 'Carpet area' },
  { value: 'BuildUpArea', label: 'Build-up area' },
  { value: 'SuperBuildUpArea', label: 'Super built-up area' },
];

export const FREQUENCY_OPTIONS: MaintenanceFrequency[] = ['Monthly', 'Quarterly', 'Annual'];

export const CHARGE_STATUS_OPTIONS: MaintenanceChargeStatus[] = ['Pending', 'ProofSubmitted', 'Rejected', 'Overdue', 'Paid', 'Failed', 'Cancelled'];

export const MONTH_OPTIONS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
] as const;

export const MAINTENANCE_PAGE_STYLES = `
  .card--spaced { display: flex; flex-direction: column; gap: 16px; }
  .stack { display: flex; flex-direction: column; gap: 12px; }
  .filters, .two-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .full-width { width: 100%; }
  .section-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
  .section-header--compact { align-items: center; }
  .section-title { margin: 0; font-size: 16px; font-weight: 600; }
  .section-copy { color: var(--text-secondary); font-size: 13px; }
  .sub-card {
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 16px;
    background: #fafafa;
  }
  .sub-card--active {
    border-color: var(--primary-light);
    box-shadow: 0 0 0 1px rgba(25, 118, 210, 0.2);
  }
  .charge-card {
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: white;
  }
  .charge-card--overdue {
    border-color: #ef9a9a;
    background: #fff7f7;
  }
  .charge-card__header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
  }
  .charge-card__meta { display: flex; flex-direction: column; gap: 4px; }
  .charge-card__title { font-weight: 600; }
  .charge-card__sub,
  .charge-card__details { color: var(--text-secondary); font-size: 13px; }
  .charge-card__details { display: flex; flex-wrap: wrap; gap: 12px; }
  .proof-list { display: flex; flex-direction: column; gap: 8px; }
  .proof-list__title { font-weight: 600; color: var(--text-primary); }
  .proof-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #f3f4f6;
    font-size: 13px;
  }
  .proof-item a { color: var(--primary); word-break: break-all; }
  .action-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .action-row--compact { margin-top: 4px; }
  .text-danger { color: #c62828; font-weight: 600; }
`;

export function buildChargeSections(charges: MaintenanceCharge[]): ChargeSection[] {
  const groups = new Map<string, ChargeSection>();

  for (const charge of charges) {
    const key = `${charge.chargeYear}-${String(charge.chargeMonth).padStart(2, '0')}`;
    const existing = groups.get(key);
    if (existing) {
      existing.charges.push(charge);
      existing.totalAmount += charge.amount;
      continue;
    }

    groups.set(key, {
      key,
      label: periodLabel(charge.chargeYear, charge.chargeMonth),
      charges: [charge],
      totalAmount: charge.amount,
    });
  }

  return Array.from(groups.values()).sort((left, right) => right.key.localeCompare(left.key));
}

export function apartmentLabel(apartments: Apartment[], apartmentId: string) {
  const apartment = apartments.find(item => item.id === apartmentId);
  return apartment ? formatApartmentLabel(apartment) : 'Assigned apartment';
}

export function formatAreaBasisLabel(areaBasis: MaintenanceAreaBasis) {
  switch (areaBasis) {
    case 'CarpetArea': return 'Carpet area';
    case 'BuildUpArea': return 'Build-up area';
    case 'SuperBuildUpArea': return 'Super built-up area';
    default: return areaBasis;
  }
}

export function periodLabel(year: number, month: number) {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

export function sortCharges(charges: MaintenanceCharge[]) {
  return charges.slice().sort((left, right) =>
    (right.chargeYear * 100 + right.chargeMonth) - (left.chargeYear * 100 + left.chargeMonth)
  );
}
