import { Apartment, formatApartmentLabel } from '../../core/models/apartment.model';
import {
  MaintenanceAreaBasis,
  MaintenanceCharge,
  MaintenanceChargeStatus,
  MaintenanceFrequency,
  MaintenancePricingType,
} from '../../core/models/maintenance.model';
import { MONTH_OPTIONS, periodLabel } from '../../shared/utils/period.util';

export { MONTH_OPTIONS, periodLabel };

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

export function formatFrequencyLabel(frequency: MaintenanceFrequency) {
  return frequency === 'Annual' ? 'Yearly' : frequency;
}

export const CHARGE_STATUS_OPTIONS: MaintenanceChargeStatus[] = ['Pending', 'ProofSubmitted', 'Rejected', 'Overdue', 'Paid', 'Failed', 'Cancelled'];

export const MAINTENANCE_PAGE_STYLES = `
  .card--spaced { display: flex; flex-direction: column; gap: 16px; }
  .stack { display: flex; flex-direction: column; gap: 12px; }
  .filters, .two-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .full-width { width: 100%; }
  .section-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
  .section-header--compact { align-items: center; }
  .section-header__actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; align-items: center; }
  .section-title { margin: 0; font-size: 16px; font-weight: 600; }
  .section-copy { color: var(--text-secondary); font-size: 13px; }
  .card-toggle {
    align-self: flex-start;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: white;
    color: var(--text-primary);
    cursor: pointer;
    font: inherit;
    padding: 6px 12px;
  }
  .card-toggle:hover { background: #f8fafc; }
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
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    z-index: 1000;
  }
  .dialog-card {
    width: min(720px, 100%);
    max-height: calc(100vh - 48px);
    overflow: auto;
    background: white;
    border-radius: 16px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2);
  }
`;

export function buildChargeSections(charges: MaintenanceCharge[]): ChargeSection[] {
  const groups = new Map<string, ChargeSection>();

  for (const charge of charges) {
    const key = `${charge.cy}-${String(charge.cm).padStart(2, '0')}`;
    const existing = groups.get(key);
    if (existing) {
      existing.charges.push(charge);
      existing.totalAmount += charge.amt;
      continue;
    }

    groups.set(key, {
      key,
      label: periodLabel(charge.cy, charge.cm),
      charges: [charge],
      totalAmount: charge.amt,
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

export function sortCharges(charges: MaintenanceCharge[]) {
  return charges.slice().sort((left, right) =>
    (right.cy * 100 + right.cm) - (left.cy * 100 + left.cm)
  );
}
