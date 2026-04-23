import { VendorCharge, VendorChargeStatus, VendorPaymentFrequency } from '../../core/models/vendor-payment.model';

export const VENDOR_FREQUENCY_OPTIONS: VendorPaymentFrequency[] = ['Weekly', 'BiWeekly', 'Monthly', 'Quarterly', 'Yearly'];
export const VENDOR_CHARGE_STATUS_OPTIONS: VendorChargeStatus[] = ['Pending', 'ProofSubmitted', 'Rejected', 'Overdue', 'Paid', 'Failed', 'Cancelled'];

export const MONTH_OPTIONS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
] as const;

export const VENDOR_PAGE_STYLES = `
  .page-content { display: flex; flex-direction: column; gap: 16px; }
  .card--spaced { display: flex; flex-direction: column; gap: 16px; }
  .stack { display: flex; flex-direction: column; gap: 12px; }
  .filters, .two-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .three-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
  .full-width { width: 100%; }
  .section-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
  .section-header__actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .section-title { margin: 0; font-size: 16px; font-weight: 600; }
  .section-copy { color: var(--text-secondary); font-size: 13px; }
  .action-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .action-row--compact { margin-top: 4px; }
  .vendor-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
  .vendor-card, .charge-card, .schedule-card {
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: white;
  }
  .vendor-card--active, .schedule-card--active { border-color: var(--primary-light); box-shadow: 0 0 0 1px rgba(25, 118, 210, 0.2); }
  .charge-card--overdue { border-color: #ef9a9a; background: #fff7f7; }
  .vendor-card__title, .schedule-card__title, .charge-card__title { font-weight: 600; }
  .vendor-card__meta, .schedule-card__meta, .charge-card__meta { color: var(--text-secondary); font-size: 13px; display: flex; flex-direction: column; gap: 4px; }
  .upload-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 999px;
    padding: 6px 10px;
    background: #eef2ff;
    color: #3730a3;
    font-size: 12px;
  }
  .totals-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
  }
  .total-card {
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px;
    background: #f8fafc;
  }
  .total-card__label { font-size: 12px; color: var(--text-secondary); }
  .total-card__value { font-size: 18px; font-weight: 700; margin-top: 4px; }
  .empty-copy { color: var(--text-secondary); font-size: 14px; }
  .inline-link { color: var(--primary); text-decoration: none; word-break: break-all; }
  .text-danger { color: #c62828; font-weight: 600; }
`;

export function monthLabel(month: number) {
  return MONTH_OPTIONS.find(item => item.value === month)?.label ?? `Month ${month}`;
}

export function periodLabel(year: number, month: number) {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

export function monthYearLabel(value: string | Date | null | undefined) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(value));
}

export function toMonthInputValue(value: string | Date | null | undefined) {
  if (!value) return '';
  const parsed = new Date(value);
  const month = `${parsed.getUTCMonth() + 1}`.padStart(2, '0');
  return `${parsed.getUTCFullYear()}-${month}`;
}

export function monthInputToIsoDate(value: string) {
  return value ? `${value}-01` : '';
}

export function sortVendorCharges(charges: VendorCharge[]) {
  return charges.slice().sort((left, right) => {
    const rightKey = new Date(right.effectiveDate).getTime();
    const leftKey = new Date(left.effectiveDate).getTime();
    return rightKey - leftKey;
  });
}

export function annualEquivalent(amount: number, frequency: VendorPaymentFrequency) {
  switch (frequency) {
    case 'Weekly': return amount * 52;
    case 'BiWeekly': return amount * 26;
    case 'Monthly': return amount * 12;
    case 'Quarterly': return amount * 4;
    case 'Yearly': return amount;
    default: return amount;
  }
}

export function monthlyEquivalent(amount: number, frequency: VendorPaymentFrequency) {
  return annualEquivalent(amount, frequency) / 12;
}
