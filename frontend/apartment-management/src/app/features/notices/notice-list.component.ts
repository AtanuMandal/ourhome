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
            <div class="notice-card" [class.notice-card--unread]="!n.rd">
              <a [routerLink]="[n.id]" class="notice-card__link">
                <div class="nc-category">{{ n.cat }}</div>
                <h3 class="nc-title">
                  @if (!n.rd) {
                    <span class="nc-unread-dot" title="Unread"></span>
                  }
                  {{ n.tt }}
                </h3>
                <p class="nc-body">{{ n.ct }}</p>
                <span class="nc-date">{{ n.pa | date:'mediumDate' }}</span>
              </a>
              @if (n.rd) {
                <span class="nc-read-tick" title="Read">
                  <mat-icon>check_circle</mat-icon>
                </span>
              } @else {
                <button
                  mat-icon-button
                  class="nc-read-toggle"
                  title="Mark as read"
                  (click)="markRead(n, $event)">
                  <mat-icon>mark_email_unread</mat-icon>
                </button>
              }
            </div>
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
    // Show every notice in the society, not just the default first-page-of-20.
    this.svc.list(sid, 1, 500).subscribe({
      next: r => { this.items.set(r.items ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  /** One-way: marks a notice read. There is no way to mark it unread again. */
  markRead(notice: Notice, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const sid = this.auth.societyId();
    if (!sid) return;

    this.svc.markRead(sid, notice.id).subscribe({
      next: () => {
        this.items.update(list =>
          list.map(n => n.id === notice.id ? { ...n, rd: true } : n)
        );
      }
    });
  }
}
