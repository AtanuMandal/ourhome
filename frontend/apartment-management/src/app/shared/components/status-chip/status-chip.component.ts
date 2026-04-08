import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

export type ChipVariant = 'success' | 'warn' | 'error' | 'info' | 'default';

const STATUS_MAP: Record<string, ChipVariant> = {
  // Complaint
  Open: 'error', InProgress: 'warn', Resolved: 'success', Closed: 'default',
  // Apartment
  Available: 'success', Occupied: 'info', Maintenance: 'warn',
  // Booking
  Pending: 'warn', Approved: 'success', Rejected: 'error', Cancelled: 'default',
  // Payment
  Paid: 'success', Overdue: 'error', Waived: 'info',
  // Visitor
  Expected: 'info', CheckedIn: 'success', CheckedOut: 'default',
  // Service Request
  Accepted: 'info', Completed: 'success',
};

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [NgClass],
  template: `<span class="chip" [ngClass]="'chip--' + variant">{{ label }}</span>`,
  styles: [`
    .chip {
      display: inline-flex; align-items: center;
      padding: 3px 10px; border-radius: 999px;
      font-size: 12px; font-weight: 500; letter-spacing: .02em;
    }
    .chip--success { background: #e8f5e9; color: #2e7d32; }
    .chip--warn    { background: #fff3e0; color: #e65100; }
    .chip--error   { background: #ffebee; color: #c62828; }
    .chip--info    { background: #e3f2fd; color: #1565c0; }
    .chip--default { background: #f3f4f6; color: #6b7280; }
  `],
})
export class StatusChipComponent {
  @Input() set status(value: string) {
    this.label   = value;
    this.variant = STATUS_MAP[value] ?? 'default';
  }
  @Input() label   = '';
  @Input() variant: ChipVariant = 'default';
}
