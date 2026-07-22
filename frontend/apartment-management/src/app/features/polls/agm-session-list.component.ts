import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AgmSessionService } from '../../core/services/agm-session.service';
import { AuthService } from '../../core/services/auth.service';
import { AgmSessionSummary } from '../../core/models/poll.model';

@Component({
  selector: 'app-agm-session-list',
  standalone: true,
  imports: [RouterLink, DatePipe, MatButtonModule, PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="AGM Sessions" [showBack]="true">
      @if (isAdmin()) {
        <a actions routerLink="new" mat-button>New Session</a>
      }
    </app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (items().length === 0) {
        <app-empty-state icon="groups" title="No AGM sessions" message="No AGM sessions have been created yet.">
          @if (isAdmin()) {
            <a routerLink="new" mat-stroked-button color="primary" style="margin-top:16px">Create Session</a>
          }
        </app-empty-state>
      } @else {
        <div class="session-list">
          @for (s of items(); track s.id) {
            <a [routerLink]="[s.id]" class="session-card">
              <div class="session-card__info">
                <span class="session-card__title">{{ s.tt }}</span>
                <span class="session-card__meta">{{ s.sd | date:'mediumDate' }} · {{ s.rc }} resolution(s)</span>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .session-list { display:flex; flex-direction:column; gap:8px; }
    .session-card { display:flex; align-items:center; gap:12px; padding:12px; border:1px solid var(--border,#e0e0e0); border-radius:12px; text-decoration:none; color:inherit; }
    .session-card__info { display:flex; flex-direction:column; gap:2px; }
    .session-card__title { font-weight:600; font-size:14px; }
    .session-card__meta { font-size:12px; color:var(--text-secondary); }
  `],
})
export class AgmSessionListComponent implements OnInit {
  private readonly agmSessionSvc = inject(AgmSessionService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly items = signal<AgmSessionSummary[]>([]);
  readonly isAdmin = this.auth.isAdmin;

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }

    this.agmSessionSvc.list(sid, 1, 50).subscribe({
      next: response => {
        this.items.set(response.items ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
