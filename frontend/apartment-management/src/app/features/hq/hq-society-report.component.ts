import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { SocietyService } from '../../core/services/society.service';
import { SocietySummaryReport } from '../../core/models/society.model';

@Component({
  selector: 'app-hq-society-report',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSpinnerComponent, StatusChipComponent],
  template: `
    <app-page-header title="Society Report" [showBack]="true"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else {
        @if (report(); as r) {
          <div class="card">
            <div class="report-title">{{ r.sn }}</div>
            <app-status-chip [status]="r.st"></app-status-chip>
          </div>

          <div class="grid">
            <div class="card stat"><div class="stat-value">{{ r.ta }}</div><div class="stat-label">Total Apartments</div></div>
            <div class="card stat"><div class="stat-value">{{ r.oa }}</div><div class="stat-label">Occupied</div></div>
            <div class="card stat"><div class="stat-value">{{ r.va }}</div><div class="stat-label">Vacant</div></div>
            <div class="card stat"><div class="stat-value">{{ r.uma }}</div><div class="stat-label">Under Maintenance</div></div>
            <div class="card stat"><div class="stat-value">{{ r.oc }}</div><div class="stat-label">Owners</div></div>
            <div class="card stat"><div class="stat-value">{{ r.tc }}</div><div class="stat-label">Tenants</div></div>
            <div class="card stat"><div class="stat-value">{{ r.tr }}</div><div class="stat-label">Total Residents</div></div>
          </div>
          <p class="disclaimer">This report contains occupancy data only — no financial information.</p>
        } @else {
          <div class="card">Report unavailable.</div>
        }
      }
    </div>
  `,
  styles: [`
    .report-title { font-size:20px; font-weight:700; margin-bottom:8px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-top:16px; }
    .stat { text-align:center; }
    .stat-value { font-size:28px; font-weight:700; color:var(--primary); }
    .stat-label { color:var(--text-secondary); font-size:13px; margin-top:4px; }
    .disclaimer { color:var(--text-secondary); font-size:12px; margin-top:16px; text-align:center; }
  `],
})
export class HqSocietyReportComponent implements OnInit {
  private readonly svc = inject(SocietyService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly report = signal<SocietySummaryReport | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }

    this.svc.getSummaryReport(id).subscribe({
      next: report => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
