import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ShiftService } from '../../core/services/staff.service';
import { AuthService } from '../../core/services/auth.service';
import { Shift } from '../../core/models/staff.model';

/** "HH:mm:ss" (backend TimeSpan serialization) → "HH:mm" for display. */
function formatTime(value: string): string {
  return value.slice(0, 5);
}

@Component({
  selector: 'app-shift-list',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Shifts" [showBack]="true">
      <a actions routerLink="new" mat-button>Add Shift</a>
    </app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (shifts().length === 0) {
        <app-empty-state icon="schedule" title="No shifts" message="No shifts defined yet.">
          <a routerLink="new" mat-stroked-button color="primary" style="margin-top:16px">Add Shift</a>
        </app-empty-state>
      } @else {
        <div class="shift-list">
          @for (shift of shifts(); track shift.id) {
            <div class="shift-card">
              <div class="shift-info">
                <span class="shift-name">{{ shift.name }}</span>
                <span class="shift-meta">{{ formatTime(shift.startTime) }} – {{ formatTime(shift.endTime) }} · {{ shift.graceMinutes }} min grace</span>
              </div>
              <a [routerLink]="[shift.id, 'edit']" mat-icon-button aria-label="Edit shift"><mat-icon>edit</mat-icon></a>
              <button mat-icon-button type="button" aria-label="Delete shift"
                      [disabled]="deleting() === shift.id" (click)="delete(shift)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .shift-list { display:flex; flex-direction:column; gap:8px; }
    .shift-card { display:flex; align-items:center; gap:12px; padding:12px; border:1px solid var(--border,#e0e0e0); border-radius:12px; }
    .shift-info { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
    .shift-name { font-weight:500; font-size:14px; }
    .shift-meta { font-size:12px; color:var(--text-secondary); }
  `],
})
export class ShiftListComponent implements OnInit {
  private readonly shiftSvc = inject(ShiftService);
  private readonly auth     = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading  = signal(true);
  readonly deleting = signal<string | null>(null);
  readonly shifts   = signal<Shift[]>([]);

  readonly formatTime = formatTime;

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }

    this.shiftSvc.list(sid).subscribe({
      next: shifts => {
        this.shifts.set(shifts ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  delete(shift: Shift) {
    const sid = this.auth.societyId();
    if (!sid) return;
    if (!confirm(`Delete shift "${shift.name}"?`)) return;

    this.deleting.set(shift.id);
    this.shiftSvc.delete(sid, shift.id).subscribe({
      next: () => {
        this.shifts.update(list => list.filter(s => s.id !== shift.id));
        this.deleting.set(null);
        this.snackBar.open('Shift deleted.', 'Dismiss', { duration: 3000 });
      },
      error: (err) => {
        this.deleting.set(null);
        const message = err?.error?.errorCode === 'SHIFT_IN_USE'
          ? 'This shift is still assigned to active staff — reassign them before deleting.'
          : 'Unable to delete the shift. Try again.';
        this.snackBar.open(message, 'Dismiss', { duration: 4000 });
      },
    });
  }
}
