import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { DatePipe, NgClass } from '@angular/common';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { AuthService } from '../../core/services/auth.service';
import { ComplaintService } from '../../core/services/complaint.service';
import { NoticeService } from '../../core/services/notice.service';
import { FeeService } from '../../core/services/fee.service';
import { Complaint } from '../../core/models/complaint.model';
import { Notice } from '../../core/models/notice.model';
import { FeeSchedule } from '../../core/models/fee.model';

interface QuickAction { icon: string; label: string; route: string; color: string; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatBadgeModule,
    DatePipe, NgClass, PageHeaderComponent, StatusChipComponent, LoadingSpinnerComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly auth      = inject(AuthService);
  private readonly complaints = inject(ComplaintService);
  private readonly notices    = inject(NoticeService);

  readonly user      = this.auth.user;
  readonly isAdmin   = this.auth.isAdmin;
  readonly societyId = this.auth.societyId;

  readonly loading          = signal(true);
  readonly recentComplaints = signal<Complaint[]>([]);
  readonly recentNotices    = signal<Notice[]>([]);

  readonly quickActions: QuickAction[] = [
    { icon: 'report_problem',         label: 'Complaint',  route: '/complaints/new',  color: '#ef5350' },
    { icon: 'event_available',        label: 'Book',       route: '/amenities',        color: '#26a69a' },
    { icon: 'badge',                  label: 'Visitor',    route: '/visitors/register',color: '#7e57c2' },
    { icon: 'account_balance_wallet', label: 'Pay Fee',    route: '/fees',             color: '#42a5f5' },
    { icon: 'build',                  label: 'Service',    route: '/services',         color: '#ff7043' },
    { icon: 'emoji_events',           label: 'Rewards',    route: '/rewards',          color: '#ffca28' },
  ];

  get greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  }

  ngOnInit() {
    const sid = this.societyId();
    if (!sid) { this.loading.set(false); return; }

    let pending = 2;
    const done = () => { if (--pending === 0) this.loading.set(false); };

    this.complaints.list(sid, 1, 3).subscribe({
      next: r => { this.recentComplaints.set(r.items ?? []); done(); },
      error: () => done(),
    });

    this.notices.list(sid, 1, 3).subscribe({
      next: r => { this.recentNotices.set(r.items ?? []); done(); },
      error: () => done(),
    });
  }
}
