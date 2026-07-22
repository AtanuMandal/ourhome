import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PersonalStatement } from '../../core/models/financial-report.model';
import { AuthService } from '../../core/services/auth.service';
import { FinancialReportService } from '../../core/services/financial-report.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';

const STYLES = `
  .page-content { max-width: 900px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 20px; }
  .card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; }
  .card-title { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 0 0 16px; }
  .filter-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; }
  .stat__label { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
  .stat__value { font-size: 1.2rem; font-weight: 700; color: #1e293b; margin-top: 4px; }
  .stat--positive .stat__value { color: #16a34a; }
  .stat--warn .stat__value { color: #d97706; }
  .table-shell { overflow-x: auto; }
  .data-table { width: 100%; border-collapse: collapse; font-size: .875rem; }
  .data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: left; }
  .data-table th { font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #64748b; background: #f8fafc; }
  .data-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .receipt-link { font-size: .8rem; color: #6366f1; text-decoration: none; }
  .receipt-link:hover { text-decoration: underline; }
`;

@Component({
  selector: 'app-personal-statement',
  standalone: true,
  imports: [
    CurrencyPipe, DatePipe, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressBarModule,
    PageHeaderComponent, EmptyStateComponent, StatusChipComponent,
  ],
  styles: [STYLES],
  template: `
    <app-page-header
      title="My Payment Statement"
      subtitle="View your maintenance charges and payment history">
    </app-page-header>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    <div class="page-content">
      <div class="card">
        <p class="card-title">Filter</p>
        <form [formGroup]="form" class="filter-row" (ngSubmit)="load()">
          <mat-form-field appearance="fill">
            <mat-label>Year</mat-label>
            <input matInput type="number" formControlName="year" placeholder="2025">
          </mat-form-field>
          <button mat-flat-button color="primary" type="submit" [disabled]="loading()">
            <mat-icon>refresh</mat-icon> Load
          </button>
        </form>
      </div>

      @if (error()) {
        <div class="card" style="color:#dc2626">{{ error() }}</div>
      }

      @if (statement()) {
        <!-- Summary -->
        <div class="card">
          <p class="card-title">{{ statement()!.apartmentLabel }} — {{ statement()!.year }} Summary</p>
          <div class="stat-grid">
            <div class="stat">
              <div class="stat__label">Total Charged</div>
              <div class="stat__value">{{ statement()!.totalCharged | currency:'INR':'symbol':'1.0-0' }}</div>
            </div>
            <div class="stat stat--positive">
              <div class="stat__label">Total Paid</div>
              <div class="stat__value">{{ statement()!.totalPaid | currency:'INR':'symbol':'1.0-0' }}</div>
            </div>
            <div class="stat" [class.stat--warn]="statement()!.totalOutstanding > 0">
              <div class="stat__label">Outstanding</div>
              <div class="stat__value">{{ statement()!.totalOutstanding | currency:'INR':'symbol':'1.0-0' }}</div>
            </div>
          </div>

          <!-- Charge history -->
          @if (statement()!.charges.length === 0) {
            <p style="color:#94a3b8;text-align:center;padding:20px">No charges found for this year.</p>
          } @else {
            <div class="table-shell">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Due Date</th>
                    <th style="text-align:right">Amount</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  @for (charge of statement()!.charges; track charge.id) {
                    <tr>
                      <td>{{ charge.period }}</td>
                      <td style="white-space:nowrap">{{ charge.dueDate | date:'dd MMM yyyy' }}</td>
                      <td class="num">{{ charge.amount | currency:'INR':'symbol':'1.0-0' }}</td>
                      <td><app-status-chip [status]="charge.status"></app-status-chip></td>
                      <td>{{ charge.paymentMethod ?? '—' }}</td>
                      <td>
                        @if (charge.receiptUrl) {
                          <a class="receipt-link" [href]="charge.receiptUrl" target="_blank">
                            <mat-icon style="font-size:14px;vertical-align:middle">open_in_new</mat-icon>
                            View
                          </a>
                        } @else {
                          <span style="color:#94a3b8">—</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      } @else if (!loading()) {
        <app-empty-state
          icon="receipt_long"
          title="No statement loaded"
          message="Select a year and click Load to view your payment history.">
        </app-empty-state>
      }
    </div>
  `,
})
export class PersonalStatementComponent {
  private readonly auth    = inject(AuthService);
  private readonly service = inject(FinancialReportService);
  private readonly fb      = inject(FormBuilder);

  readonly loading   = signal(false);
  readonly error     = signal<string | null>(null);
  readonly statement = signal<PersonalStatement | null>(null);

  readonly form = this.fb.group({
    year: [new Date().getFullYear(), Validators.required],
  });

  constructor() {
    this.load();
  }

  load() {
    const societyId   = this.auth.societyId();
    const apartmentId = this.auth.user()?.aid;
    if (!societyId || !apartmentId) return;

    this.loading.set(true);
    this.error.set(null);
    this.service.getPersonalStatement(
      societyId, apartmentId, this.form.value.year ?? undefined
    ).subscribe({
      next: s  => { this.statement.set(s); this.loading.set(false); },
      error: () => { this.error.set('Failed to load your payment statement.'); this.loading.set(false); },
    });
  }
}
