import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { NoticeService } from '../../core/services/notice.service';
import { AuthService } from '../../core/services/auth.service';
import { Notice } from '../../core/models/notice.model';

@Component({
  selector: 'app-notice-detail',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header [title]="item()?.title ?? 'Notice'" [showBack]="true"></app-page-header>
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
          @if (item()!.postedByUserId) {
            <div class="notice-author">
              <span class="material-icons">person</span>
              Posted by {{ item()!.postedByUserId }}
            </div>
          }
        </div>
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
  `],
})
export class NoticeDetailComponent implements OnInit {
  private readonly svc   = inject(NoticeService);
  private readonly auth  = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly item    = signal<Notice | null>(null);

  ngOnInit() {
    const sid = this.auth.societyId()!;
    const id  = this.route.snapshot.paramMap.get('id')!;
    this.svc.get(sid, id).subscribe({
      next: n => { this.item.set(n); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}

