import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFabButton } from '@angular/material/button';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ComplaintService } from '../../core/services/complaint.service';
import { AuthService } from '../../core/services/auth.service';
import { Complaint } from '../../core/models/complaint.model';

@Component({
  selector: 'app-complaint-list',
  standalone: true,
  imports: [RouterLink, DatePipe, MatButtonModule, MatIconModule, PageHeaderComponent,
            StatusChipComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Complaints"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (items().length === 0) {
        <app-empty-state icon="check_circle" title="No complaints" message="All issues have been resolved.">
          <a routerLink="new" mat-stroked-button color="primary" style="margin-top:16px">Raise Complaint</a>
        </app-empty-state>
      } @else {
        <div class="list">
          @for (c of items(); track c.id) {
            <a [routerLink]="[c.id]" class="complaint-card">
              <div class="cc-header">
                <span class="cc-title">{{ c.title }}</span>
                <app-status-chip [status]="c.status"></app-status-chip>
              </div>
              <p class="cc-desc">{{ c.description }}</p>
              <div class="cc-meta">
                <span class="material-icons">category</span> {{ c.category }} &nbsp;·&nbsp;
                <span class="material-icons">schedule</span> {{ c.createdAt | date:'mediumDate' }}
              </div>
            </a>
          }
        </div>
      }
    </div>
    <a routerLink="new" mat-fab color="primary" class="fab" aria-label="Raise complaint">
      <mat-icon>add</mat-icon>
    </a>
  `,
  styleUrl: './complaints.scss',
})
export class ComplaintListComponent implements OnInit {
  private readonly svc  = inject(ComplaintService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly items   = signal<Complaint[]>([]);

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }
    this.svc.list(sid).subscribe({
      next: r => { this.items.set(r.items ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
