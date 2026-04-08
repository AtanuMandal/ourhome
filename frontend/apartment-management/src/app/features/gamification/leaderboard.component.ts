import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { GamificationService } from '../../core/services/gamification.service';
import { AuthService } from '../../core/services/auth.service';
import { LeaderboardEntry } from '../../core/models/gamification.model';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule,
            PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Leaderboard &amp; Rewards"></app-page-header>
    <div class="page-content">
      <div class="points-banner card" style="margin-bottom:16px">
        <div class="pb-icon"><span class="material-icons">emoji_events</span></div>
        <div class="pb-info">
          <span class="pb-label">Your Points</span>
          <span class="pb-value">{{ myPoints() }}</span>
        </div>
        <a routerLink="points" mat-stroked-button color="primary">History</a>
      </div>

      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (entries().length === 0) {
        <app-empty-state icon="leaderboard" title="No leaderboard" message="Join a competition to get started."></app-empty-state>
      } @else {
        <h3 style="font-size:14px;font-weight:600;margin:0 0 12px">Community Rankings</h3>
        <div class="lb-list">
          @for (e of entries(); track e.userId) {
            <div class="lb-card" [class.top3]="e.rank <= 3">
              <span class="lb-rank" [class.gold]="e.rank===1" [class.silver]="e.rank===2" [class.bronze]="e.rank===3">
                {{ e.rank }}
              </span>
              <div class="avatar">{{ e.userName[0] }}</div>
              <div class="lb-info">
                <span class="lb-name">{{ e.userName }}</span>
                @if (e.apartmentUnit) { <span class="lb-unit">{{ e.apartmentUnit }}</span> }
              </div>
              <span class="lb-pts">{{ e.points }} pts</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './gamification.scss',
})
export class LeaderboardComponent implements OnInit {
  private readonly svc  = inject(GamificationService);
  private readonly auth = inject(AuthService);

  readonly loading  = signal(true);
  readonly entries  = signal<LeaderboardEntry[]>([]);
  readonly myPoints = signal(0);

  ngOnInit() {
    const sid    = this.auth.societyId()!;
    const userId = this.auth.user()?.id ?? '';

    // Load user points
    if (userId) {
      this.svc.getUserPoints(sid, userId).subscribe({
        next: p => this.myPoints.set(p.totalPoints),
      });
    }

    // Fake competition ID for demo — in real app would list competitions first
    this.loading.set(false);
  }
}
