import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { AuthService } from '../../core/services/auth.service';
import { ComplaintService } from '../../core/services/complaint.service';
import { NoticeService } from '../../core/services/notice.service';
import { FinancialReportService } from '../../core/services/financial-report.service';
import { Complaint } from '../../core/models/complaint.model';
import { Notice } from '../../core/models/notice.model';
import { FinancialDashboard } from '../../core/models/financial-report.model';

interface QuickAction { icon: string; label: string; route: string; color: string; }

// One definition per feature — reused across role configs below.
const A = {
  myApt:        { icon: 'apartment',       label: 'My Apartment', route: '/my-apartment',                     color: '#1565c0' },
  users:        { icon: 'people',          label: 'Users',        route: '/residents',                        color: '#1565c0' },
  residents:    { icon: 'people',          label: 'Residents',    route: '/residents',                        color: '#1565c0' },
  apartments:   { icon: 'domain',          label: 'Apartments',   route: '/apartments',                       color: '#26a69a' },
  amenities:    { icon: 'event_available', label: 'Book Amenity', route: '/amenities',                        color: '#26a69a' },
  book:         { icon: 'event_available', label: 'Book',         route: '/amenities',                        color: '#26a69a' },
  newComplaint: { icon: 'report_problem',  label: 'Complaint',    route: '/complaints/new',                   color: '#ef5350' },
  complaints:   { icon: 'report_problem',  label: 'Complaints',   route: '/complaints',                       color: '#ef5350' },
  visitors:     { icon: 'badge',           label: 'Visitors',     route: '/visitors',                         color: '#7e57c2' },
  newVisitor:   { icon: 'badge',           label: 'Visitor',      route: '/visitors/register',                color: '#7e57c2' },
  maintenance:  { icon: 'receipt_long',    label: 'Maintenance',  route: '/maintenance',                      color: '#42a5f5' },
  notices:      { icon: 'notifications',   label: 'Notices',      route: '/notices',                          color: '#ff9800' },
  noticesMgmt:  { icon: 'campaign',        label: 'Notices',      route: '/notices',                          color: '#ff9800' },
  service:      { icon: 'build',           label: 'Service',      route: '/services',                         color: '#ff7043' },
  rewards:      { icon: 'emoji_events',    label: 'Rewards',      route: '/rewards',                          color: '#ffca28' },
  reports:      { icon: 'bar_chart',       label: 'Reports',      route: '/financial-report',                 color: '#00897b' },
  myStatement:  { icon: 'bar_chart',       label: 'My Statement', route: '/financial-report/my-statement',    color: '#00897b' },
  societySummary: { icon: 'pie_chart',     label: 'Soc. Finances',route: '/financial-report/society-summary', color: '#00897b' },
  staff:        { icon: 'badge',           label: 'Staff',        route: '/staff',                            color: '#5e35b1' },
} satisfies Record<string, QuickAction>;

// Role → ordered quick-action list; 'default' covers HQAdmin / HQUser.
const ROLE_ACTIONS: Partial<Record<string, QuickAction[]>> = {
  SUUser:     [A.myApt,        A.newComplaint, A.notices,     A.myStatement,  A.societySummary, A.rewards     ],
  SUAdmin:    [A.users,        A.apartments,   A.complaints,  A.visitors,     A.maintenance,    A.reports,   A.staff],
  SUSecurity: [A.visitors,     A.residents,    A.newComplaint,A.notices,      A.maintenance,    A.rewards,   A.staff],
  default:    [A.newComplaint, A.book,         A.newVisitor,  A.maintenance,  A.service,        A.rewards     ],
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatBadgeModule,
    CurrencyPipe, DatePipe, NgClass, PageHeaderComponent, StatusChipComponent, LoadingSpinnerComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly auth            = inject(AuthService);
  private readonly complaints      = inject(ComplaintService);
  private readonly notices         = inject(NoticeService);
  private readonly financialReport = inject(FinancialReportService);

  readonly user      = this.auth.user;
  readonly societyId = this.auth.societyId;
  readonly isAdmin   = this.auth.isAdmin;

  readonly loading          = signal(true);
  readonly recentComplaints = signal<Complaint[]>([]);
  readonly recentNotices    = signal<Notice[]>([]);
  readonly financialSummary = signal<FinancialDashboard | null>(null);

  readonly quickActions = computed<QuickAction[]>(() =>
    ROLE_ACTIONS[this.user()?.role ?? ''] ?? ROLE_ACTIONS['default']!
  );

  get greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  }

  ngOnInit() {
    const sid = this.societyId();
    if (!sid) { this.loading.set(false); return; }

    // Only admins are authorized to call the financial-report dashboard endpoint —
    // skip the request entirely for non-admin roles rather than call it and swallow a 403.
    const financial$ = this.isAdmin()
      ? this.financialReport.getDashboard(sid).pipe(catchError(() => of(null)))
      : of(null);

    forkJoin({
      complaints: this.complaints.list(sid, 1, 3),
      notices:    this.notices.list(sid, 1, 3),
      financial:  financial$,
    }).subscribe({
      next: ({ complaints, notices, financial }) => {
        this.recentComplaints.set(complaints.items ?? []);
        this.recentNotices.set(notices.items ?? []);
        this.financialSummary.set(financial);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
