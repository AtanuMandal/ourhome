import { CurrencyPipe, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SocietySummary } from '../../core/models/financial-report.model';
import { AuthService } from '../../core/services/auth.service';
import { FinancialReportService } from '../../core/services/financial-report.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const STYLES = `
  .page-content { max-width: 800px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 20px; }
  .card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; }
  .card-title { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 0 0 16px; }
  .section-label { font-size: .8rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; margin: 0 0 12px; }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
  .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; }
  .stat__label { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
  .stat__value { font-size: 1.2rem; font-weight: 700; color: #1e293b; margin-top: 4px; }
  .stat--positive .stat__value { color: #16a34a; }
  .stat--negative .stat__value { color: #dc2626; }
  .stat--warn .stat__value { color: #d97706; }
  .efficiency-bar { height: 6px; background: #e2e8f0; border-radius: 3px; margin-top: 8px; overflow: hidden; }
  .efficiency-fill { height: 100%; background: #16a34a; border-radius: 3px; }
  .divider { border: none; border-top: 1px solid #f1f5f9; margin: 20px 0; }
  .expense-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .expense-label { font-size: .875rem; color: #374151; min-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .expense-bar-track { flex: 2; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
  .expense-bar-fill  { height: 100%; background: #6366f1; border-radius: 4px; transition: width .4s; }
  .expense-amount { font-size: .875rem; font-variant-numeric: tabular-nums; color: #374151; min-width: 80px; text-align: right; }
  .expense-pct { font-size: .75rem; color: #64748b; min-width: 36px; text-align: right; }
  .notice-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; font-size: .8rem; color: #92400e; }
`;

@Component({
  selector: 'app-society-summary',
  standalone: true,
  imports: [
    CurrencyPipe, NgClass,
    MatProgressBarModule,
    PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent,
  ],
  styles: [STYLES],
  template: `
    <app-page-header
      title="Society Financial Summary"
      subtitle="Anonymised overview — no resident data is shown">
    </app-page-header>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    <div class="page-content">
      <div class="notice-box">
        This summary shows aggregate figures only. Individual resident payment details are not visible here.
      </div>

      @if (error()) {
        <div class="card" style="color:#dc2626">{{ error() }}</div>
      }

      @if (summary()) {
        <!-- Current month -->
        <div class="card">
          <p class="section-label">{{ monthLabel(summary()!.currentMonth) }} {{ summary()!.currentYear }} — Current Month</p>
          <div class="stat-grid">
            <div class="stat">
              <div class="stat__label">Total Due</div>
              <div class="stat__value">{{ summary()!.totalDueCurrentMonth | currency:'INR':'symbol':'1.0-0' }}</div>
            </div>
            <div class="stat stat--positive">
              <div class="stat__label">Collected</div>
              <div class="stat__value">{{ summary()!.totalCollectedCurrentMonth | currency:'INR':'symbol':'1.0-0' }}</div>
            </div>
            <div class="stat">
              <div class="stat__label">Collection Rate</div>
              <div class="stat__value">{{ summary()!.collectionPercentageCurrentMonth }}%</div>
              <div class="efficiency-bar">
                <div class="efficiency-fill" [style.width.%]="summary()!.collectionPercentageCurrentMonth"></div>
              </div>
            </div>
            <div class="stat stat--negative">
              <div class="stat__label">Vendor Expenses</div>
              <div class="stat__value">{{ summary()!.vendorExpensesCurrentMonth | currency:'INR':'symbol':'1.0-0' }}</div>
            </div>
            <div class="stat" [ngClass]="summary()!.netCurrentMonth >= 0 ? 'stat--positive' : 'stat--negative'">
              <div class="stat__label">Net This Month</div>
              <div class="stat__value">{{ summary()!.netCurrentMonth | currency:'INR':'symbol':'1.0-0' }}</div>
            </div>
          </div>
        </div>

        <!-- Year-to-date -->
        <div class="card">
          <p class="section-label">Financial Year to Date</p>
          <div class="stat-grid" style="margin-bottom:20px">
            <div class="stat stat--positive">
              <div class="stat__label">Total Collected</div>
              <div class="stat__value">{{ summary()!.totalCollectedYtd | currency:'INR':'symbol':'1.0-0' }}</div>
            </div>
            <div class="stat stat--negative">
              <div class="stat__label">Vendor Expenses</div>
              <div class="stat__value">{{ summary()!.totalVendorExpensesYtd | currency:'INR':'symbol':'1.0-0' }}</div>
            </div>
            <div class="stat" [ngClass]="summary()!.netYtd >= 0 ? 'stat--positive' : 'stat--negative'">
              <div class="stat__label">Net YTD</div>
              <div class="stat__value">{{ summary()!.netYtd | currency:'INR':'symbol':'1.0-0' }}</div>
            </div>
          </div>

          @if (summary()!.expenseBreakdownYtd.length > 0) {
            <hr class="divider">
            <p class="card-title" style="margin-bottom:12px">Expense Breakdown by Category</p>
            @for (cat of summary()!.expenseBreakdownYtd; track cat.category) {
              <div class="expense-row">
                <span class="expense-label" [title]="cat.category">{{ cat.category }}</span>
                <div class="expense-bar-track">
                  <div class="expense-bar-fill" [style.width.%]="cat.percentageOfTotal"></div>
                </div>
                <span class="expense-amount">{{ cat.amount | currency:'INR':'symbol':'1.0-0' }}</span>
                <span class="expense-pct">{{ cat.percentageOfTotal }}%</span>
              </div>
            }
          }
        </div>
      } @else if (!loading()) {
        <app-empty-state
          icon="bar_chart"
          title="No data available"
          message="Maintenance charges and vendor payments will appear here once created.">
        </app-empty-state>
      }
    </div>
  `,
})
export class SocietySummaryComponent {
  private readonly auth    = inject(AuthService);
  private readonly service = inject(FinancialReportService);

  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);
  readonly summary = signal<SocietySummary | null>(null);

  constructor() {
    this.load();
  }

  private load() {
    const societyId = this.auth.societyId();
    if (!societyId) return;
    this.loading.set(true);
    this.service.getSocietySummary(societyId).subscribe({
      next: s  => { this.summary.set(s); this.loading.set(false); },
      error: () => { this.error.set('Failed to load society summary.'); this.loading.set(false); },
    });
  }

  monthLabel(month: number) {
    return MONTH_NAMES[month - 1] ?? '';
  }
}
