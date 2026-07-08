import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { PollService } from '../../core/services/poll.service';
import { AuthService } from '../../core/services/auth.service';
import { Poll } from '../../core/models/poll.model';

@Component({
  selector: 'app-poll-detail',
  standalone: true,
  imports: [DatePipe, FormsModule, MatButtonModule, MatRadioModule, MatCheckboxModule,
            PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header title="Poll" [showBack]="true"></app-page-header>
    <div class="page-content">
      @if (poll(); as p) {
        <div class="card">
          <h2 class="poll-title">{{ p.title }}</h2>
          @if (p.isAgmResolution) { <span class="agm-badge">AGM Resolution</span> }
          <p class="poll-desc">{{ p.description }}</p>
          <p class="poll-meta">
            Opens {{ p.opensAt | date:'medium' }} · Closes {{ p.closesAt | date:'medium' }}
            · <span class="status-chip" [class]="'status-chip--' + p.status.toLowerCase()">{{ p.status }}</span>
          </p>

          @if (p.outcome) {
            <p class="outcome-banner" [class]="'outcome-banner--' + p.outcome.toLowerCase()">
              Outcome: {{ p.outcome === 'NoQuorum' ? 'No Quorum Reached' : p.outcome }}
            </p>
          }

          @if (canVote()) {
            <section class="vote-section">
              <h3>Cast Your Vote</h3>
              @if (p.hasVoted && !p.allowVoteChange) {
                <p>You voted for: {{ myVoteLabels() }}</p>
              } @else {
                @if (p.type === 'SingleChoice') {
                  <mat-radio-group [(ngModel)]="singleSelection">
                    @for (o of p.options; track o.id) {
                      <mat-radio-button [value]="o.id">{{ o.text }}</mat-radio-button>
                    }
                  </mat-radio-group>
                } @else {
                  @for (o of p.options; track o.id) {
                    <mat-checkbox [checked]="multiSelection().has(o.id)" (change)="toggleOption(o.id)">{{ o.text }}</mat-checkbox>
                  }
                }
                <button mat-raised-button color="primary" (click)="submitVote()" [disabled]="voting() || !hasSelection()" style="margin-top:12px">
                  {{ p.hasVoted ? 'Change Vote' : 'Submit Vote' }}
                </button>
              }
            </section>
          }

          @if (p.tally; as tally) {
            <section class="tally-section">
              <h3>Tally</h3>
              @if (p.participantCount != null && p.eligibleCount != null) {
                <p class="poll-meta">{{ p.participantCount }} of {{ p.eligibleCount }} eligible have voted</p>
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
              @if (p.status === 'Open') {
                <button mat-stroked-button color="warn" (click)="closePoll()" [disabled]="actioning()">Close Poll Early</button>
              }
              @if (p.status === 'Closed' && !p.resultsPublished) {
                <button mat-stroked-button color="primary" (click)="publishResults()" [disabled]="actioning()">Publish Results</button>
              }
            </section>
          }
        </div>
      } @else if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      }
    </div>
  `,
  styles: [`
    .poll-title { margin: 0 0 4px; }
    .agm-badge { display:inline-block; font-size:11px; font-weight:600; color:#6a1b9a; background:#f3e5f5; border-radius:999px; padding:3px 10px; margin-bottom:8px; }
    .poll-desc { color: var(--text-secondary); }
    .poll-meta { font-size:13px; color:var(--text-secondary); }
    .status-chip { font-size:11px; font-weight:600; border-radius:999px; padding:2px 8px; }
    .status-chip--scheduled { background:#fff8e1; color:#f57f17; }
    .status-chip--open { background:#e3f2fd; color:#1565c0; }
    .status-chip--closed { background:#eceff1; color:#546e7a; }
    .outcome-banner { padding:8px 12px; border-radius:8px; font-weight:600; }
    .outcome-banner--passed { background:#e8f5e9; color:#2e7d32; }
    .outcome-banner--failed { background:#ffebee; color:#c62828; }
    .outcome-banner--noquorum { background:#fff3e0; color:#e65100; }
    .vote-section, .tally-section, .admin-actions { margin-top:20px; }
    .tally-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border,#eee); }
    .tally-count { font-weight:600; }
    .admin-actions { display:flex; gap:8px; }
  `],
})
export class PollDetailComponent implements OnInit {
  private readonly pollSvc = inject(PollService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly voting = signal(false);
  readonly actioning = signal(false);
  readonly poll = signal<Poll | null>(null);
  readonly isAdmin = this.auth.isAdmin;

  readonly singleSelection = signal<string | null>(null);
  readonly multiSelection = signal<Set<string>>(new Set());

  readonly canVote = computed(() => {
    const p = this.poll();
    return !!p && this.auth.user()?.role === 'SUUser' && p.status === 'Open';
  });

  readonly myVoteLabels = computed(() => {
    const p = this.poll();
    if (!p?.mySelectedOptionIds) return '';
    return p.options.filter(o => p.mySelectedOptionIds!.includes(o.id)).map(o => o.text).join(', ');
  });

  ngOnInit() {
    this.load();
  }

  private load() {
    const sid = this.auth.societyId();
    const id = this.route.snapshot.paramMap.get('id');
    if (!sid || !id) { this.loading.set(false); return; }

    this.loading.set(true);
    this.pollSvc.get(sid, id).subscribe({
      next: poll => {
        this.poll.set(poll);
        this.singleSelection.set(poll.mySelectedOptionIds?.[0] ?? null);
        this.multiSelection.set(new Set(poll.mySelectedOptionIds ?? []));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleOption(optionId: string) {
    this.multiSelection.update(set => {
      const next = new Set(set);
      if (next.has(optionId)) next.delete(optionId); else next.add(optionId);
      return next;
    });
  }

  hasSelection(): boolean {
    const p = this.poll();
    if (!p) return false;
    return p.type === 'SingleChoice' ? this.singleSelection() !== null : this.multiSelection().size > 0;
  }

  submitVote() {
    const sid = this.auth.societyId();
    const p = this.poll();
    if (!sid || !p) return;

    const selectedOptionIds = p.type === 'SingleChoice'
      ? (this.singleSelection() ? [this.singleSelection()!] : [])
      : Array.from(this.multiSelection());
    if (selectedOptionIds.length === 0) return;

    this.voting.set(true);
    this.pollSvc.vote(sid, p.id, { selectedOptionIds }).subscribe({
      next: () => {
        this.voting.set(false);
        this.snackBar.open('Vote recorded.', 'Dismiss', { duration: 3000 });
        this.load();
      },
      error: () => this.voting.set(false),
    });
  }

  closePoll() {
    const sid = this.auth.societyId();
    const p = this.poll();
    if (!sid || !p) return;

    this.actioning.set(true);
    this.pollSvc.close(sid, p.id).subscribe({
      next: updated => {
        this.poll.set(updated);
        this.actioning.set(false);
        this.snackBar.open('Poll closed.', 'Dismiss', { duration: 3000 });
      },
      error: () => this.actioning.set(false),
    });
  }

  publishResults() {
    const sid = this.auth.societyId();
    const p = this.poll();
    if (!sid || !p) return;

    this.actioning.set(true);
    this.pollSvc.publishResults(sid, p.id).subscribe({
      next: updated => {
        this.poll.set(updated);
        this.actioning.set(false);
        this.snackBar.open('Results published.', 'Dismiss', { duration: 3000 });
      },
      error: () => this.actioning.set(false),
    });
  }
}
