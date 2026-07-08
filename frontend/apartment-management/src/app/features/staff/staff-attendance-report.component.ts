import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { StaffService } from '../../core/services/staff.service';
import { AuthService } from '../../core/services/auth.service';
import { StaffAttendanceReportEntry } from '../../core/models/staff.model';

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-staff-attendance-report',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule,
            PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Staff Attendance Report" [showBack]="true"></app-page-header>
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
      } @else if (entries().length === 0) {
        <app-empty-state icon="bar_chart" title="No data" message="No attendance records for this date range."></app-empty-state>
      } @else {
        <table class="report-table">
          <thead>
            <tr>
              <th>Staff</th><th>Category</th><th>Present</th><th>Late</th><th>Absent</th><th>On Leave</th>
            </tr>
          </thead>
          <tbody>
            @for (entry of entries(); track entry.staffId) {
              <tr>
                <td>{{ entry.staffName }}</td>
                <td>{{ entry.category }}</td>
                <td>{{ entry.presentDays }}</td>
                <td>{{ entry.lateDays }}</td>
                <td>{{ entry.absentDays }}</td>
                <td>{{ entry.onLeaveDays }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [`
    .filters { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:16px; }
    .report-table { width:100%; border-collapse:collapse; }
    .report-table th, .report-table td { text-align:left; padding:8px 12px; border-bottom:1px solid var(--border,#e0e0e0); font-size:14px; }
    .report-table th { color:var(--text-secondary); font-weight:600; font-size:12px; text-transform:uppercase; }
  `],
})
export class StaffAttendanceReportComponent implements OnInit {
  private readonly staffSvc = inject(StaffService);
  private readonly auth     = inject(AuthService);

  readonly loading  = signal(true);
  readonly entries  = signal<StaffAttendanceReportEntry[]>([]);
  readonly fromDate = signal(isoDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  readonly toDate   = signal(isoDate(new Date()));

  ngOnInit() {
    this.load();
  }

  load() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }

    this.loading.set(true);
    this.staffSvc.attendanceReport(sid, this.fromDate(), this.toDate()).subscribe({
      next: report => {
        this.entries.set(report.entries ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
