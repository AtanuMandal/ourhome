import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { GamificationService } from '../../core/services/gamification.service';
import { AuthService } from '../../core/services/auth.service';
import { UserPoints } from '../../core/models/gamification.model';

@Component({
  selector: 'app-points',
  standalone: true,
  imports: [DatePipe, MatButtonModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header title="My Points" [showBack]="true"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (data()) {
        <div class="card points-total">
          <span class="material-icons">emoji_events</span>
          <div>
            <p class="pt-label">Total Points</p>
            <p class="pt-value">{{ data()!.totalPoints }}</p>
          </div>
        </div>

        @if (data()!.history.length) {
          <div class="card" style="margin-top:12px">
            <h3 style="font-size:14px;font-weight:600;margin:0 0 12px">Points History</h3>
            @for (event of data()!.history; track event.id) {
              <div class="point-event">
                <div class="pe-action">{{ event.action }}</div>
                @if (event.description) { <div class="pe-desc">{{ event.description }}</div> }
                <div class="pe-meta">{{ event.earnedAt | date:'medium' }}</div>
                <div class="pe-pts" [class.positive]="event.points > 0">
                  {{ event.points > 0 ? '+' : '' }}{{ event.points }}
                </div>
              </div>
            }
          </div>
        }
      } @else {
        <div style="text-align:center;padding:48px;color:var(--text-secondary)">No points data</div>
      }
    </div>
  `,
  styles: [`
    .points-total {
      display:flex;align-items:center;gap:16px;
      .material-icons { font-size:48px;color:#ffd700; }
      .pt-label { font-size:13px;color:var(--text-secondary);margin:0; }
      .pt-value { font-size:36px;font-weight:700;color:var(--primary-dark);margin:0; }
    }
    .point-event {
      display:grid;grid-template-columns:1fr auto;gap:4px 8px;
      padding:12px 0;border-bottom:1px solid var(--border);
      &:last-child { border-bottom:none; }
      .pe-action { font-size:14px;font-weight:500; }
      .pe-desc   { font-size:12px;color:var(--text-secondary);grid-column:1; }
      .pe-meta   { font-size:11px;color:var(--text-secondary);grid-column:1; }
      .pe-pts    { grid-column:2;grid-row:1/4;font-size:18px;font-weight:700;
        color:var(--text-secondary);align-self:center;
        &.positive { color:var(--success); }
      }
    }
  `],
})
export class PointsComponent implements OnInit {
  private readonly svc  = inject(GamificationService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly data    = signal<UserPoints | null>(null);

  ngOnInit() {
    const sid    = this.auth.societyId()!;
    const userId = this.auth.user()?.id ?? '';
    if (!userId) { this.loading.set(false); return; }
    this.svc.getUserPoints(sid, userId).subscribe({
      next: p => { this.data.set(p); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
