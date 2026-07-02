import { CurrencyPipe, DatePipe, NgClass, PercentPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { Apartment, formatApartmentLabel } from '../../core/models/apartment.model';
import { ApartmentLedger, CashFlow, CashFlowMonth, FinancialDashboard } from '../../core/models/financial-report.model';
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { FinancialReportService } from '../../core/services/financial-report.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';

type Tab = 'dashboard' | 'cashflow' | 'ledger';

const STYLES = `
  .page-content { max-width: 1200px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 20px; }
  .tabs { display: flex; gap: 4px; background: #f1f5f9; border-radius: 10px; padding: 4px; width: fit-content; }
  .tab-btn { padding: 8px 20px; border: none; background: transparent; border-radius: 8px; font-size: .875rem; font-weight: 500; cursor: pointer; color: #64748b; transition: all .15s; }
  .tab-btn.active { background: white; color: #1e293b; box-shadow: 0 1px 3px rgba(0,0,0,.1); font-weight: 600; }
  .card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; }
  .card-title { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 0 0 16px; }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; }
  .stat__label { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
  .stat__value { font-size: 1.35rem; font-weight: 700; color: #1e293b; margin-top: 4px; }
  .stat--positive .stat__value { color: #16a34a; }
  .stat--negative .stat__value { color: #dc2626; }
  .stat--warn .stat__value { color: #d97706; }
  .efficiency-bar { height: 6px; background: #e2e8f0; border-radius: 3px; margin-top: 8px; overflow: hidden; }
  .efficiency-fill { height: 100%; background: #16a34a; border-radius: 3px; transition: width .4s; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media(max-width:640px){ .two-col { grid-template-columns: 1fr; } }
  .table-shell { overflow-x: auto; }
  .data-table { width: 100%; border-collapse: collapse; font-size: .875rem; }
  .data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: left; }
  .data-table th { font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #64748b; background: #f8fafc; }
  .data-table tfoot td { font-weight: 700; background: #f1f5f9; border-top: 2px solid #e2e8f0; }
  .data-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .text-green { color: #16a34a; }
  .text-red { color: #dc2626; }
  .text-amber { color: #d97706; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: .7rem; font-weight: 600; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-green { background: #dcfce7; color: #14532d; }
  .badge-red   { background: #fee2e2; color: #7f1d1d; }
  .filter-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
  .section-label { font-size: .8rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; margin: 0 0 8px; }
  .net-positive { font-size: 1.5rem; font-weight: 800; color: #16a34a; }
  .net-negative { font-size: 1.5rem; font-weight: 800; color: #dc2626; }
  .cashflow-month-col { min-width: 90px; text-align: right !important; }
  .empty-hint { text-align: center; padding: 40px 20px; color: #94a3b8; font-size: .9rem; }
  .ledger-debit  { color: #dc2626; }
  .ledger-credit { color: #16a34a; }
  .outstanding-chip { display: inline-block; background: #fee2e2; color: #7f1d1d; padding: 4px 12px; border-radius: 999px; font-size: .8rem; font-weight: 700; margin-top: 4px; }
  .outstanding-chip.zero { background: #dcfce7; color: #14532d; }
`;

@Component({
  selector: 'app-financial-report',
  standalone: true,
  imports: [
    CurrencyPipe, DatePipe, NgClass, ReactiveFormsModule, RouterLink,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressBarModule,
    PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent, SearchableSelectComponent,
  ],
  styles: [STYLES],
  template: `
    <app-page-header
      title="Financial Reports"
      subtitle="Society income, expenses, and cash flow analysis">
    </app-page-header>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    <div class="page-content">
      <!-- Tab bar -->
      <div class="tabs">
        <button class="tab-btn" [class.active]="activeTab() === 'dashboard'"
          (click)="setTab('dashboard')">Dashboard</button>
        <button class="tab-btn" [class.active]="activeTab() === 'cashflow'"
          (click)="setTab('cashflow')">Cash Flow</button>
        <button class="tab-btn" [class.active]="activeTab() === 'ledger'"
          (click)="setTab('ledger')">Apartment Ledger</button>
      </div>

      @if (error()) {
        <div class="card" style="color:#dc2626">{{ error() }}</div>
      }

      <!-- ── DASHBOARD TAB ────────────────────────────────────────── -->
      @if (activeTab() === 'dashboard') {
        @if (dashboard()) {
          <div class="card">
            <p class="section-label">{{ dashboard()!.monthLabel }} — Monthly Overview</p>
            <div class="stat-grid">
              <div class="stat">
                <div class="stat__label">Maintenance Billed</div>
                <div class="stat__value">{{ dashboard()!.maintenanceBilled | currency:'INR':'symbol':'1.0-0' }}</div>
              </div>
              <div class="stat stat--positive">
                <div class="stat__label">Collected</div>
                <div class="stat__value">{{ dashboard()!.maintenanceCollected | currency:'INR':'symbol':'1.0-0' }}</div>
              </div>
              <div class="stat stat--warn">
                <div class="stat__label">Pending</div>
                <div class="stat__value">{{ dashboard()!.maintenancePending | currency:'INR':'symbol':'1.0-0' }}</div>
              </div>
              <div class="stat" [ngClass]="dashboard()!.maintenanceOverdue > 0 ? 'stat--negative' : ''">
                <div class="stat__label">Overdue</div>
                <div class="stat__value">{{ dashboard()!.maintenanceOverdue | currency:'INR':'symbol':'1.0-0' }}</div>
              </div>
              <div class="stat">
                <div class="stat__label">Collection Rate</div>
                <div class="stat__value">{{ dashboard()!.collectionEfficiencyPercent }}%</div>
                <div class="efficiency-bar">
                  <div class="efficiency-fill"
                    [style.width.%]="dashboard()!.collectionEfficiencyPercent"></div>
                </div>
              </div>
              <div class="stat stat--negative">
                <div class="stat__label">Vendor Bills</div>
                <div class="stat__value">{{ dashboard()!.vendorBilled | currency:'INR':'symbol':'1.0-0' }}</div>
              </div>
              <div class="stat" [ngClass]="dashboard()!.netPosition >= 0 ? 'stat--positive' : 'stat--negative'">
                <div class="stat__label">Net Position</div>
                <div class="stat__value">{{ dashboard()!.netPosition | currency:'INR':'symbol':'1.0-0' }}</div>
              </div>
            </div>
          </div>

          <div class="two-col">
            <!-- Top overdue apartments -->
            <div class="card">
              <p class="card-title">Top Overdue Apartments</p>
              @if (dashboard()!.topOverdueApartments.length === 0) {
                <div class="empty-hint">No overdue payments this month</div>
              } @else {
                <div class="table-shell">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Apartment</th>
                        <th>Overdue</th>
                        <th>Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (apt of dashboard()!.topOverdueApartments; track apt.apartmentId) {
                        <tr>
                          <td>{{ apt.apartmentLabel }}</td>
                          <td class="num text-red">{{ apt.overdueAmount | currency:'INR':'symbol':'1.0-0' }}</td>
                          <td class="num"><span class="badge badge-red">{{ apt.daysOverdue }}d</span></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>

            <!-- Upcoming vendor dues -->
            <div class="card">
              <p class="card-title">Upcoming Vendor Dues (7 days)</p>
              @if (dashboard()!.upcomingVendorDues.length === 0) {
                <div class="empty-hint">No vendor payments due in the next 7 days</div>
              } @else {
                <div class="table-shell">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Vendor</th>
                        <th>Amount</th>
                        <th>Due in</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (due of dashboard()!.upcomingVendorDues; track due.vendorId) {
                        <tr>
                          <td>{{ due.vendorName }}</td>
                          <td class="num">{{ due.amount | currency:'INR':'symbol':'1.0-0' }}</td>
                          <td class="num">
                            <span class="badge" [ngClass]="due.daysUntilDue <= 2 ? 'badge-red' : 'badge-amber'">
                              {{ due.daysUntilDue === 0 ? 'Today' : due.daysUntilDue + 'd' }}
                            </span>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        } @else if (!loading()) {
          <app-empty-state
            icon="bar_chart"
            title="No data for current month"
            message="Create a maintenance fee schedule to start tracking income.">
          </app-empty-state>
        }
      }

      <!-- ── CASH FLOW TAB ────────────────────────────────────────── -->
      @if (activeTab() === 'cashflow') {
        <div class="card">
          <p class="card-title">Date Range</p>
          <form [formGroup]="cashFlowForm" class="filter-row" (ngSubmit)="loadCashFlow()">
            <mat-form-field appearance="fill">
              <mat-label>From Month</mat-label>
              <input matInput type="number" formControlName="fromMonth" min="1" max="12" placeholder="1-12">
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>From Year</mat-label>
              <input matInput type="number" formControlName="fromYear" placeholder="2025">
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>To Month</mat-label>
              <input matInput type="number" formControlName="toMonth" min="1" max="12" placeholder="1-12">
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>To Year</mat-label>
              <input matInput type="number" formControlName="toYear" placeholder="2025">
            </mat-form-field>
            <button mat-flat-button color="primary" type="submit" [disabled]="loading()">
              <mat-icon>refresh</mat-icon> Load
            </button>
          </form>
        </div>

        @if (cashFlow()) {
          <!-- Summary row -->
          <div class="card">
            <div class="stat-grid">
              <div class="stat stat--positive">
                <div class="stat__label">Total Cash In</div>
                <div class="stat__value">{{ cashFlow()!.totalCashIn | currency:'INR':'symbol':'1.0-0' }}</div>
              </div>
              <div class="stat stat--negative">
                <div class="stat__label">Total Cash Out</div>
                <div class="stat__value">{{ cashFlow()!.totalCashOut | currency:'INR':'symbol':'1.0-0' }}</div>
              </div>
              <div class="stat" [ngClass]="cashFlow()!.netPosition >= 0 ? 'stat--positive' : 'stat--negative'">
                <div class="stat__label">Net Position</div>
                <div class="stat__value">{{ cashFlow()!.netPosition | currency:'INR':'symbol':'1.0-0' }}</div>
              </div>
            </div>
          </div>

          <!-- Month-by-month table -->
          <div class="card">
            <p class="card-title">Monthly Breakdown</p>
            <div class="table-shell">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th style="text-align:right">Maintenance Collected</th>
                    <th style="text-align:right">Total Cash In</th>
                    <th style="text-align:right">Vendor Paid</th>
                    <th style="text-align:right">Total Cash Out</th>
                    <th style="text-align:right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of cashFlow()!.months; track m.month + '-' + m.year) {
                    <tr>
                      <td>{{ m.monthLabel }}</td>
                      <td class="num text-green">{{ m.maintenanceCollected | currency:'INR':'symbol':'1.0-0' }}</td>
                      <td class="num text-green">{{ m.totalCashIn | currency:'INR':'symbol':'1.0-0' }}</td>
                      <td class="num text-red">{{ m.vendorPaid | currency:'INR':'symbol':'1.0-0' }}</td>
                      <td class="num text-red">{{ m.totalCashOut | currency:'INR':'symbol':'1.0-0' }}</td>
                      <td class="num" [ngClass]="m.netCash >= 0 ? 'text-green' : 'text-red'">
                        {{ m.netCash | currency:'INR':'symbol':'1.0-0' }}
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td class="num">{{ cashFlow()!.totalCashIn | currency:'INR':'symbol':'1.0-0' }}</td>
                    <td class="num">{{ cashFlow()!.totalCashIn | currency:'INR':'symbol':'1.0-0' }}</td>
                    <td class="num">{{ cashFlow()!.totalCashOut | currency:'INR':'symbol':'1.0-0' }}</td>
                    <td class="num">{{ cashFlow()!.totalCashOut | currency:'INR':'symbol':'1.0-0' }}</td>
                    <td class="num" [ngClass]="cashFlow()!.netPosition >= 0 ? 'text-green' : 'text-red'">
                      {{ cashFlow()!.netPosition | currency:'INR':'symbol':'1.0-0' }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        } @else if (!loading()) {
          <app-empty-state
            icon="trending_up"
            title="Select a date range"
            message="Choose from/to months above and click Load to generate the cash flow statement.">
          </app-empty-state>
        }
      }

      <!-- ── APARTMENT LEDGER TAB ─────────────────────────────────── -->
      @if (activeTab() === 'ledger') {
        <div class="card">
          <p class="card-title">Apartment Selection</p>
          <form [formGroup]="ledgerForm" class="filter-row" (ngSubmit)="loadLedger()">
            <div style="min-width:240px">
              <app-searchable-select
                label="Apartment"
                formControlName="apartmentId"
                [options]="apartmentOptions()"
                errorMessage="Select an apartment">
              </app-searchable-select>
            </div>
            <mat-form-field appearance="fill">
              <mat-label>From Year</mat-label>
              <input matInput type="number" formControlName="fromYear" placeholder="2024">
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>To Year</mat-label>
              <input matInput type="number" formControlName="toYear" placeholder="2025">
            </mat-form-field>
            <button mat-flat-button color="primary" type="submit"
              [disabled]="loading() || !ledgerForm.get('apartmentId')?.value">
              <mat-icon>search</mat-icon> Load Ledger
            </button>
          </form>
        </div>

        @if (ledger()) {
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px">
              <div>
                <p class="card-title" style="margin:0">{{ ledger()!.apartmentLabel }}</p>
                @if (ledger()!.primaryResidentName) {
                  <p style="font-size:.875rem;color:#64748b;margin:4px 0 0">{{ ledger()!.primaryResidentName }}</p>
                }
              </div>
              <span class="outstanding-chip" [ngClass]="ledger()!.currentOutstanding === 0 ? 'zero' : ''">
                Outstanding: {{ ledger()!.currentOutstanding | currency:'INR':'symbol':'1.0-0' }}
              </span>
            </div>
            <div class="table-shell">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th style="text-align:right">Debit (₹)</th>
                    <th style="text-align:right">Credit (₹)</th>
                    <th style="text-align:right">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  @for (entry of ledger()!.entries; track entry.date + entry.description) {
                    <tr>
                      <td style="white-space:nowrap">{{ entry.date | date:'dd MMM yyyy' }}</td>
                      <td>{{ entry.description }}</td>
                      <td class="num ledger-debit">
                        {{ entry.debit != null ? (entry.debit | currency:'INR':'symbol':'1.0-0') : '—' }}
                      </td>
                      <td class="num ledger-credit">
                        {{ entry.credit != null ? (entry.credit | currency:'INR':'symbol':'1.0-0') : '—' }}
                      </td>
                      <td class="num" [ngClass]="entry.balance > 0 ? 'text-red' : 'text-green'">
                        {{ entry.balance | currency:'INR':'symbol':'1.0-0' }}
                      </td>
                    </tr>
                  }
                </tbody>
                @if (ledger()!.entries.length === 0) {
                  <tbody><tr><td colspan="5" class="empty-hint">No transactions found for this apartment.</td></tr></tbody>
                }
              </table>
            </div>
          </div>
        } @else if (!loading()) {
          <app-empty-state
            icon="receipt_long"
            title="No ledger loaded"
            message="Enter an apartment ID and click Load Ledger to view the transaction history.">
          </app-empty-state>
        }
      }
    </div>
  `,
})
export class FinancialReportComponent implements OnInit {
  private readonly auth             = inject(AuthService);
  private readonly service          = inject(FinancialReportService);
  private readonly apartmentService = inject(ApartmentService);
  private readonly fb               = inject(FormBuilder);

  readonly activeTab = signal<Tab>('dashboard');
  readonly loading   = signal(false);
  readonly error     = signal<string | null>(null);

  readonly dashboard = signal<FinancialDashboard | null>(null);
  readonly cashFlow  = signal<CashFlow | null>(null);
  readonly ledger    = signal<ApartmentLedger | null>(null);

  private readonly apartments = signal<Apartment[]>([]);
  readonly apartmentOptions = computed(() =>
    this.apartments().map(a => ({ value: a.id, label: formatApartmentLabel(a) }))
  );

  private get societyId() { return this.auth.societyId() ?? ''; }

  readonly cashFlowForm = this.fb.group({
    fromMonth: [4,              [Validators.required, Validators.min(1), Validators.max(12)]],
    fromYear:  [this.currentFyStart(), [Validators.required]],
    toMonth:   [new Date().getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
    toYear:    [new Date().getFullYear(), [Validators.required]],
  });

  readonly ledgerForm = this.fb.group({
    apartmentId: ['', Validators.required],
    fromYear:    [null as number | null],
    toYear:      [null as number | null],
  });

  ngOnInit() {
    this.loadDashboard();
    if (this.societyId) {
      this.apartmentService.list(this.societyId, 1, 200).subscribe({
        next: res => this.apartments.set(res.items ?? []),
      });
    }
  }

  setTab(tab: Tab) {
    this.activeTab.set(tab);
    if (tab === 'dashboard' && !this.dashboard()) this.loadDashboard();
  }

  loadDashboard() {
    if (!this.societyId) return;
    this.loading.set(true);
    this.error.set(null);
    this.service.getDashboard(this.societyId).subscribe({
      next: d  => { this.dashboard.set(d); this.loading.set(false); },
      error: () => { this.error.set('Failed to load dashboard.'); this.loading.set(false); },
    });
  }

  loadCashFlow() {
    if (!this.cashFlowForm.valid || !this.societyId) return;
    const v = this.cashFlowForm.value;
    this.loading.set(true);
    this.error.set(null);
    this.service.getCashFlow(
      this.societyId,
      v.fromMonth!, v.fromYear!, v.toMonth!, v.toYear!
    ).subscribe({
      next: d  => { this.cashFlow.set(d); this.loading.set(false); },
      error: () => { this.error.set('Failed to load cash flow. Check the date range.'); this.loading.set(false); },
    });
  }

  loadLedger() {
    const aptId = this.ledgerForm.get('apartmentId')?.value;
    if (!aptId || !this.societyId) return;
    const v = this.ledgerForm.value;
    this.loading.set(true);
    this.error.set(null);
    this.service.getApartmentLedger(
      this.societyId, aptId,
      v.fromYear ?? undefined,
      v.toYear   ?? undefined
    ).subscribe({
      next: d  => { this.ledger.set(d); this.loading.set(false); },
      error: () => { this.error.set('Failed to load apartment ledger.'); this.loading.set(false); },
    });
  }

  private currentFyStart(): number {
    const now = new Date();
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  }
}
