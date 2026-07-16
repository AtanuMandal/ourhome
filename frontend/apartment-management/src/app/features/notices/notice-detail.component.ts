import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { NoticeService } from '../../core/services/notice.service';
import { PollService } from '../../core/services/poll.service';
import { AuthService } from '../../core/services/auth.service';
import { Notice, NoticeReadReceipts } from '../../core/models/notice.model';
import { PollSummary } from '../../core/models/poll.model';

@Component({
  selector: 'app-notice-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, MatButtonModule, MatIconModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header [title]="item()?.title ?? 'Notice'" [showBack]="true">
      @if (auth.isAdmin() && item()) {
        <div actions class="header-actions">
          <button mat-icon-button [routerLink]="['/notices', 'edit', item()!.id]" aria-label="Edit notice">
            <mat-icon>edit</mat-icon>
          </button>
          <button mat-icon-button (click)="toggleReadReceipts()" aria-label="Read report">
            <mat-icon>fact_check</mat-icon>
          </button>
        </div>
      }
    </app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (item()) {
        <div class="card">
          <div class="notice-meta">
            <span class="category">{{ item()!.category }}</span>
            <span class="date">{{ item()!.publishAt | date:'medium' }}</span>
          </div>
          <h2 class="notice-title">{{ item()!.title }}</h2>
          <div class="notice-body">{{ item()!.content }}</div>
          @if (item()!.postedByName || item()!.postedByUserId) {
            <div class="notice-author">
              <span class="material-icons">person</span>
              Posted by {{ item()!.postedByName || 'Unknown' }}
            </div>
          }
        </div>

        @if (showReadReceipts()) {
          <div class="card read-receipts">
            <p class="card-title">Read Report</p>
            @if (readReceipts(); as receipts) {
              <div class="receipt-section">
                <p class="receipt-heading">Read ({{ receipts.read.length }})</p>
                @if (receipts.read.length === 0) {
                  <p class="receipt-empty">No one has read this notice yet.</p>
                }
                @for (entry of receipts.read; track entry.userId) {
                  <div class="receipt-row">
                    <span class="material-icons receipt-icon receipt-icon--read">check_circle</span>
                    {{ entry.fullName }}
                  </div>
                }
              </div>
              <div class="receipt-section">
                <p class="receipt-heading">Unread ({{ receipts.unread.length }})</p>
                @if (receipts.unread.length === 0) {
                  <p class="receipt-empty">Everyone has read this notice.</p>
                }
                @for (entry of receipts.unread; track entry.userId) {
                  <div class="receipt-row">
                    <span class="material-icons receipt-icon receipt-icon--unread">radio_button_unchecked</span>
                    {{ entry.fullName }}
                  </div>
                }
              </div>
            } @else if (readReceiptsLoading()) {
              <app-loading-spinner></app-loading-spinner>
            }
          </div>
        }

        @if (linkedPoll(); as poll) {
          <a [routerLink]="['/polls', poll.id]" class="linked-poll-banner">
            <span class="material-icons">how_to_vote</span>
            <span>This notice has an associated poll: <strong>{{ poll.title }}</strong> — tap to view or vote</span>
          </a>
        }
      }
    </div>
  `,
  styles: [`
    .notice-meta { display:flex; justify-content:space-between; margin-bottom:8px; }
    .category { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.08em; color:var(--primary-light); }
    .date { font-size:12px; color:var(--text-secondary); }
    .notice-title { font-size:20px; font-weight:700; margin:0 0 16px; }
    .notice-body { font-size:15px; line-height:1.7; white-space:pre-wrap; }
    .notice-author { display:flex; align-items:center; gap:6px; margin-top:16px; font-size:13px; color:var(--text-secondary); }
    .notice-author .material-icons { font-size:16px; }
    .linked-poll-banner {
      display:flex; align-items:center; gap:10px; margin-top:16px; padding:12px 16px;
      border-radius:12px; background:#ede7f6; color:#4527a0; text-decoration:none; font-size:14px;
    }
    .header-actions { display:flex; align-items:center; }
    .read-receipts { margin-top:16px; }
    .card-title { font-size:16px; font-weight:700; margin:0 0 12px; }
    .receipt-section { margin-bottom:16px; }
    .receipt-section:last-child { margin-bottom:0; }
    .receipt-heading { font-size:13px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.05em; margin:0 0 8px; }
    .receipt-empty { font-size:13px; color:var(--text-secondary); margin:0; }
    .receipt-row { display:flex; align-items:center; gap:8px; padding:4px 0; font-size:14px; }
    .receipt-icon { font-size:18px; }
    .receipt-icon--read { color:#2e7d32; }
    .receipt-icon--unread { color:var(--text-secondary); }
  `],
})
export class NoticeDetailComponent implements OnInit {
  private readonly svc     = inject(NoticeService);
  private readonly pollSvc = inject(PollService);
  readonly auth            = inject(AuthService);
  private readonly route   = inject(ActivatedRoute);

  readonly loading    = signal(true);
  readonly item       = signal<Notice | null>(null);
  readonly linkedPoll = signal<PollSummary | null>(null);

  readonly showReadReceipts   = signal(false);
  readonly readReceiptsLoading = signal(false);
  readonly readReceipts       = signal<NoticeReadReceipts | null>(null);

  ngOnInit() {
    const sid = this.auth.societyId()!;
    const id  = this.route.snapshot.paramMap.get('id')!;
    this.svc.get(sid, id).subscribe({
      next: n => {
        this.item.set(n);
        this.loading.set(false);
        if (!n.isReadByCurrentUser) {
          this.svc.markRead(sid, id).subscribe();
        }
      },
      error: () => this.loading.set(false),
    });

    this.pollSvc.list(sid, 1, 1, id).subscribe({
      next: response => this.linkedPoll.set(response.items?.[0] ?? null),
      error: () => {},
    });
  }

  toggleReadReceipts() {
    this.showReadReceipts.update(v => !v);
    if (this.showReadReceipts() && !this.readReceipts()) {
      const sid = this.auth.societyId()!;
      const id  = this.item()!.id;
      this.readReceiptsLoading.set(true);
      this.svc.getReadReceipts(sid, id).subscribe({
        next: receipts => { this.readReceipts.set(receipts); this.readReceiptsLoading.set(false); },
        error: () => this.readReceiptsLoading.set(false),
      });
    }
  }
}

