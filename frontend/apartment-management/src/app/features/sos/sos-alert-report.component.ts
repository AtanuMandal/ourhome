import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SosService } from '../../core/services/sos.service';
import { AuthService } from '../../core/services/auth.service';
import { SosAlertReport, SOS_CATEGORY_LABELS } from '../../core/models/sos.model';

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-sos-alert-report',
  standalone: true,
  imports: [DecimalPipe, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule,
            PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="SOS Alert Report" [showBack]="true"></app-page-header>
    <div class="page-content">
      <div class="filters">
        <mat-form-field appearance="outline">
          <mat-label>From</mat-label>
          <input matInput type="date" [ngModel]="fromDate()" (ngModelChange)="fromDate.set($event)">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>To</mat-label>
          <input matInput type="date" [ngModel]="toDate()" (ngModelChange)="toDate.set($event)">
        </mat-form-field>
        <button mat-raised-button color="primary" type="button" (click)="load()">Run Report</button>
      </div>

      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (!report()) {
        <app-empty-state icon="bar_chart" title="No data" message="No SOS alerts for this date range."></app-empty-state>
      } @else {
        <div class="summary-cards">
          <div class="summary-card">
            <span class="summary-card__value">{{ report()!.ta }}</span>
            <span class="summary-card__label">Total Alerts</span>
          </div>
          <div class="summary-card">
            <span class="summary-card__value">{{ report()!.fr }}%</span>
            <span class="summary-card__label">False Alarm Rate</span>
          </div>
          <div class="summary-card">
            <span class="summary-card__value">{{ report()!.aa ? (report()!.aa! | number:'1.0-0') + 's' : '—' }}</span>
            <span class="summary-card__label">Avg. Time to Acknowledge</span>
          </div>
          <div class="summary-card">
            <span class="summary-card__value">{{ report()!.ar ? (report()!.ar! | number:'1.0-0') + 's' : '—' }}</span>
            <span class="summary-card__label">Avg. Time to Resolve</span>
          </div>
        </div>

        <table class="report-table">
          <thead>
            <tr><th>Category</th><th>Count</th></tr>
          </thead>
          <tbody>
            @for (c of report()!.bc; track c.cat) {
              <tr>
                <td>{{ categoryLabel(c.cat) }}</td>
                <td>{{ c.ct }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [`
    .filters { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:16px; }
    .summary-cards { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-bottom:20px; }
    .summary-card { display:flex; flex-direction:column; gap:4px; padding:16px; border:1px solid var(--border,#e0e0e0); border-radius:12px; }
    .summary-card__value { font-size:22px; font-weight:700; }
    .summary-card__label { font-size:12px; color:var(--text-secondary); }
    .report-table { width:100%; border-collapse:collapse; }
    .report-table th, .report-table td { text-align:left; padding:8px 12px; border-bottom:1px solid var(--border,#e0e0e0); font-size:14px; }
    .report-table th { color:var(--text-secondary); font-weight:600; font-size:12px; text-transform:uppercase; }
  `],
})
export class SosAlertReportComponent implements OnInit {
  private readonly sosSvc = inject(SosService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly report = signal<SosAlertReport | null>(null);
  readonly fromDate = signal(isoDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  readonly toDate = signal(isoDate(new Date()));

  categoryLabel(category: keyof typeof SOS_CATEGORY_LABELS) {
    return SOS_CATEGORY_LABELS[category];
  }

  ngOnInit() {
    this.load();
  }

  load() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }

    this.loading.set(true);
    this.sosSvc.report(sid, this.fromDate(), this.toDate()).subscribe({
      next: report => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
