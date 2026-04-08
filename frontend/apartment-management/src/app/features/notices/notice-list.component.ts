import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { NoticeService } from '../../core/services/notice.service';
import { AuthService } from '../../core/services/auth.service';
import { Notice } from '../../core/models/notice.model';

@Component({
  selector: 'app-notice-list',
  standalone: true,
  imports: [RouterLink, DatePipe, MatButtonModule, MatIconModule, MatChipsModule,
            PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Notice Board"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (items().length === 0) {
        <app-empty-state icon="campaign" title="No notices" message="No announcements posted yet."></app-empty-state>
      } @else {
        <div class="notice-list">
          @for (n of items(); track n.id) {
            <a [routerLink]="[n.id]" class="notice-card">
              <div class="nc-category">{{ n.category }}</div>
              <h3 class="nc-title">{{ n.title }}</h3>
              <p class="nc-body">{{ n.content }}</p>
              <span class="nc-date">{{ n.publishAt | date:'mediumDate' }}</span>
            </a>
          }
        </div>
      }
    </div>
    @if (isAdmin()) {
      <a routerLink="new" mat-fab color="primary" class="fab" aria-label="Post notice">
        <mat-icon>add</mat-icon>
      </a>
    }
  `,
  styleUrl: './notices.scss',
})
export class NoticeListComponent implements OnInit {
  private readonly svc  = inject(NoticeService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly items   = signal<Notice[]>([]);
  readonly isAdmin = this.auth.isAdmin;

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }
    this.svc.list(sid).subscribe({
      next: r => { this.items.set(r.items ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
