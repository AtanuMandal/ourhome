import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { AgmSessionService } from '../../core/services/agm-session.service';
import { PollService } from '../../core/services/poll.service';
import { AuthService } from '../../core/services/auth.service';
import { AgmSessionDetail, Poll } from '../../core/models/poll.model';

@Component({
  selector: 'app-agm-session-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, MatButtonModule, MatRadioModule, MatCheckboxModule,
            PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header title="AGM Session" [showBack]="true">
      @if (isAdmin() && session()) {
        <a actions [routerLink]="['/polls/new']" [queryParams]="{ agmSessionId: session()!.id }" mat-button>Add Resolution</a>
      }
    </app-page-header>
    <div class="page-content">
      @if (session(); as s) {
        <div class="card">
          <h2 class="session-title">{{ s.title }}</h2>
          <p class="session-desc">{{ s.description }}</p>
          <p class="session-meta">{{ s.sessionDate | date:'medium' }} · {{ s.resolutions.length }} resolution(s)</p>
        </div>

        @for (r of s.resolutions; track r.id) {
          <div class="card resolution-card">
            <h3 class="resolution-title">{{ r.title }}</h3>
            <p class="resolution-desc">{{ r.description }}</p>
            <p class="poll-meta">
              Closes {{ r.closesAt | date:'medium' }}
              · <span class="status-chip" [class]="'status-chip--' + r.status.toLowerCase()">{{ r.status }}</span>
            </p>

            @if (r.outcome) {
              <p class="outcome-banner" [class]="'outcome-banner--' + r.outcome.toLowerCase()">
                Outcome: {{ r.outcome === 'NoQuorum' ? 'No Quorum Reached' : r.outcome }}
              </p>
            }

            @if (canVote(r)) {
              <section class="vote-section">
                @if (r.hasVoted && !r.allowVoteChange) {
                  <p>You voted for: {{ myVoteLabels(r) }}</p>
                } @else {
                  @if (r.type === 'SingleChoice') {
                    <mat-radio-group [ngModel]="singleSelection(r.id)" (ngModelChange)="setSingleSelection(r.id, $event)">
                      @for (o of r.options; track o.id) {
                        <mat-radio-button [value]="o.id">{{ o.text }}</mat-radio-button>
                      }
                    </mat-radio-group>
                  } @else {
                    @for (o of r.options; track o.id) {
                      <mat-checkbox [checked]="multiSelection(r.id).has(o.id)" (change)="toggleOption(r.id, o.id)">{{ o.text }}</mat-checkbox>
                    }
                  }
                  <button mat-raised-button color="primary" (click)="submitVote(r)" [disabled]="voting() === r.id || !hasSelection(r)" style="margin-top:12px">
                    {{ r.hasVoted ? 'Change Vote' : 'Submit Vote' }}
                  </button>
                }
              </section>
            }

            @if (r.tally; as tally) {
              <section class="tally-section">
                @if (r.participantCount != null && r.eligibleCount != null) {
                  <p class="poll-meta">{{ r.participantCount }} of {{ r.eligibleCount }} eligible have voted</p>
                }
                @for (t of tally; track t.id) {
                  <div class="tally-row">
                    <span>{{ t.text }}</span>
                    <span class="tally-count">{{ t.voteCount }}</span>
                  </div>
                }
              </section>
            }

            @if (isAdmin()) {
              <section class="admin-actions">
                @if (r.status === 'Open') {
                  <button mat-stroked-button color="warn" (click)="closeResolution(r)" [disabled]="actioning() === r.id">Close Early</button>
                }
                @if (r.status === 'Closed' && !r.resultsPublished) {
                  <button mat-stroked-button color="primary" (click)="publishResolution(r)" [disabled]="actioning() === r.id">Publish Results</button>
                }
              </section>
            }
          </div>
        }
      } @else if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      }
    </div>
  `,
  styles: [`
    .session-title { margin: 0 0 4px; }
    .session-desc { color: var(--text-secondary); }
    .session-meta { font-size:13px; color:var(--text-secondary); }
    .resolution-card { margin-top:16px; }
    .resolution-title { margin: 0 0 4px; }
    .resolution-desc { color: var(--text-secondary); font-size:14px; }
    .poll-meta { font-size:13px; color:var(--text-secondary); }
    .status-chip { font-size:11px; font-weight:600; border-radius:999px; padding:2px 8px; }
    .status-chip--scheduled { background:#fff8e1; color:#f57f17; }
    .status-chip--open { background:#e3f2fd; color:#1565c0; }
    .status-chip--closed { background:#eceff1; color:#546e7a; }
    .outcome-banner { padding:8px 12px; border-radius:8px; font-weight:600; }
    .outcome-banner--passed { background:#e8f5e9; color:#2e7d32; }
    .outcome-banner--failed { background:#ffebee; color:#c62828; }
    .outcome-banner--noquorum { background:#fff3e0; color:#e65100; }
    .vote-section, .tally-section, .admin-actions { margin-top:16px; }
    .tally-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border,#eee); }
    .tally-count { font-weight:600; }
    .admin-actions { display:flex; gap:8px; }
  `],
})
export class AgmSessionDetailComponent implements OnInit {
  private readonly agmSessionSvc = inject(AgmSessionService);
  private readonly pollSvc = inject(PollService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly voting = signal<string | null>(null);
  readonly actioning = signal<string | null>(null);
  readonly session = signal<AgmSessionDetail | null>(null);
  readonly isAdmin = this.auth.isAdmin;

  private readonly selections = signal<Map<string, Set<string>>>(new Map());

  ngOnInit() {
    this.load();
  }

  private load() {
    const sid = this.auth.societyId();
    const id = this.route.snapshot.paramMap.get('id');
    if (!sid || !id) { this.loading.set(false); return; }

    this.loading.set(true);
    this.agmSessionSvc.get(sid, id).subscribe({
      next: session => {
        this.session.set(session);
        const initial = new Map<string, Set<string>>();
        for (const r of session.resolutions) initial.set(r.id, new Set(r.mySelectedOptionIds ?? []));
        this.selections.set(initial);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  canVote(resolution: Poll): boolean {
    return this.auth.user()?.role === 'SUUser' && resolution.status === 'Open';
  }

  myVoteLabels(resolution: Poll): string {
    if (!resolution.mySelectedOptionIds) return '';
    return resolution.options.filter(o => resolution.mySelectedOptionIds!.includes(o.id)).map(o => o.text).join(', ');
  }

  singleSelection(pollId: string): string | null {
    const set = this.selections().get(pollId);
    return set && set.size > 0 ? [...set][0] : null;
  }

  setSingleSelection(pollId: string, optionId: string) {
    this.selections.update(map => {
      const next = new Map(map);
      next.set(pollId, new Set([optionId]));
      return next;
    });
  }

  multiSelection(pollId: string): Set<string> {
    return this.selections().get(pollId) ?? new Set();
  }

  toggleOption(pollId: string, optionId: string) {
    this.selections.update(map => {
      const next = new Map(map);
      const current = new Set(next.get(pollId) ?? []);
      if (current.has(optionId)) current.delete(optionId); else current.add(optionId);
      next.set(pollId, current);
      return next;
    });
  }

  hasSelection(resolution: Poll): boolean {
    return this.multiSelection(resolution.id).size > 0;
  }

  submitVote(resolution: Poll) {
    const sid = this.auth.societyId();
    if (!sid) return;
    const selectedOptionIds = Array.from(this.multiSelection(resolution.id));
    if (selectedOptionIds.length === 0) return;

    this.voting.set(resolution.id);
    this.pollSvc.vote(sid, resolution.id, { selectedOptionIds }).subscribe({
      next: () => {
        this.voting.set(null);
        this.snackBar.open('Vote recorded.', 'Dismiss', { duration: 3000 });
        this.load();
      },
      error: () => this.voting.set(null),
    });
  }

  closeResolution(resolution: Poll) {
    const sid = this.auth.societyId();
    if (!sid) return;
    this.actioning.set(resolution.id);
    this.pollSvc.close(sid, resolution.id).subscribe({
      next: () => {
        this.actioning.set(null);
        this.snackBar.open('Resolution closed.', 'Dismiss', { duration: 3000 });
        this.load();
      },
      error: () => this.actioning.set(null),
    });
  }

  publishResolution(resolution: Poll) {
    const sid = this.auth.societyId();
    if (!sid) return;
    this.actioning.set(resolution.id);
    this.pollSvc.publishResults(sid, resolution.id).subscribe({
      next: () => {
        this.actioning.set(null);
        this.snackBar.open('Results published.', 'Dismiss', { duration: 3000 });
        this.load();
      },
      error: () => this.actioning.set(null),
    });
  }
}
