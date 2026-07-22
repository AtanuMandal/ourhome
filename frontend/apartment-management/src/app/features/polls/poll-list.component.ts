import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PollService } from '../../core/services/poll.service';
import { AuthService } from '../../core/services/auth.service';
import { PollSummary } from '../../core/models/poll.model';

@Component({
  selector: 'app-poll-list',
  standalone: true,
  imports: [RouterLink, DatePipe, MatButtonModule, MatIconModule,
            PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Polls">
      <a actions routerLink="/agm-sessions" mat-button>AGM Sessions</a>
      @if (isAdmin()) {
        <a actions routerLink="new" mat-button>New Poll</a>
      }
    </app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (items().length === 0) {
        <app-empty-state icon="how_to_vote" title="No polls" message="No polls have been created yet.">
          @if (isAdmin()) {
            <a routerLink="new" mat-stroked-button color="primary" style="margin-top:16px">Create Poll</a>
          }
        </app-empty-state>
      } @else {
        <div class="poll-list">
          @for (p of items(); track p.id) {
            <a [routerLink]="[p.id]" class="poll-card">
              <div class="poll-card__info">
                <span class="poll-card__title">{{ p.tt }}</span>
                <span class="poll-card__meta">
                  {{ p.ty === 'MultipleChoice' ? 'Multiple choice' : 'Single choice' }}
                  @if (p.agm) { · AGM Resolution }
                  · Closes {{ p.ca | date:'medium' }}
                </span>
              </div>
              <span class="status-chip" [class]="'status-chip--' + p.st.toLowerCase()">{{ p.st }}</span>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .poll-list { display:flex; flex-direction:column; gap:8px; }
    .poll-card { display:flex; align-items:center; gap:12px; padding:12px; border:1px solid var(--border,#e0e0e0); border-radius:12px; text-decoration:none; color:inherit; }
    .poll-card__info { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
    .poll-card__title { font-weight:600; font-size:14px; }
    .poll-card__meta { font-size:12px; color:var(--text-secondary); }
    .status-chip { font-size:11px; font-weight:600; border-radius:999px; padding:3px 10px; flex-shrink:0; }
    .status-chip--scheduled { background:#fff8e1; color:#f57f17; }
    .status-chip--open { background:#e3f2fd; color:#1565c0; }
    .status-chip--closed { background:#eceff1; color:#546e7a; }
  `],
})
export class PollListComponent implements OnInit {
  private readonly pollSvc = inject(PollService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly items = signal<PollSummary[]>([]);
  readonly isAdmin = this.auth.isAdmin;

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }

    this.pollSvc.list(sid, 1, 50).subscribe({
      next: response => {
        this.items.set(response.items ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
