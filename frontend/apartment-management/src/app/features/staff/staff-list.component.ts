import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { StaffService } from '../../core/services/staff.service';
import { AuthService } from '../../core/services/auth.service';
import { Staff, StaffCategory } from '../../core/models/staff.model';

const CATEGORY_ORDER: StaffCategory[] = ['Security', 'Housekeeping', 'Gardener', 'Plumber', 'Electrician', 'Other'];

interface CategoryGroup { category: StaffCategory; staff: Staff[]; }

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [RouterLink, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
            PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Staff">
      @if (isAdmin()) {
        <a actions routerLink="attendance-report" mat-button>Attendance Report</a>
      }
    </app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else {

        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search by name or phone</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Search staff…">
        </mat-form-field>

        @if (filtered().length === 0) {
          <app-empty-state icon="badge" title="No staff" message="No staff members found.">
            @if (isAdmin()) {
              <a routerLink="new" mat-stroked-button color="primary" style="margin-top:16px">Add Staff</a>
            }
          </app-empty-state>
        } @else {
          @for (group of groupedByCategory(); track group.category) {
            <div class="section-title">{{ group.category }} ({{ group.staff.length }})</div>
            <div class="staff-list">
              @for (s of group.staff; track s.id) {
                <div class="staff-card">
                  <div class="avatar">{{ s.fn[0] }}</div>
                  <div class="sc-info">
                    <span class="sc-name">{{ s.fn }}</span>
                    <span class="sc-meta">{{ s.ph }} @if (s.sn) { · {{ s.sn }} }</span>
                    @if (!s.ac) { <span class="sc-inactive">Deactivated</span> }
                  </div>
                  @if (isOnDuty(s.id)) {
                    <span class="on-duty-chip">On Duty</span>
                  }
                  @if (s.ac) {
                    @if (isOnDuty(s.id)) {
                      <button mat-stroked-button color="warn" type="button" [disabled]="actioning() === s.id" (click)="checkOut(s)">
                        Check Out
                      </button>
                    } @else {
                      <button mat-stroked-button color="primary" type="button" [disabled]="actioning() === s.id" (click)="checkIn(s)">
                        Check In
                      </button>
                    }
                  }
                  @if (isAdmin()) {
                    <a [routerLink]="[s.id, 'edit']" mat-icon-button aria-label="Edit staff"><mat-icon>edit</mat-icon></a>
                    @if (s.ac) {
                      <button mat-icon-button type="button" aria-label="Deactivate staff"
                              [disabled]="actioning() === s.id" (click)="deactivate(s)">
                        <mat-icon>person_off</mat-icon>
                      </button>
                    }
                  }
                </div>
              }
            </div>
          }
        }
      }
    </div>
    @if (isAdmin()) {
      <a routerLink="new" mat-fab color="primary" class="fab"><mat-icon>add</mat-icon></a>
    }
  `,
  styles: [`
    .search-field { width:100%; margin-bottom:12px; }
    .section-title { font-size:14px; font-weight:600; color:var(--text-secondary); margin:16px 0 8px; text-transform:uppercase; letter-spacing:.02em; }
    .staff-list { display:flex; flex-direction:column; gap:8px; }
    .staff-card { display:flex; align-items:center; gap:12px; padding:12px; border:1px solid var(--border,#e0e0e0); border-radius:12px; }
    .avatar { width:40px;height:40px;border-radius:50%;background:var(--primary-light,#1976d2);color:#fff;
      display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0; }
    .sc-info { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
    .sc-name { font-weight:500; font-size:14px; }
    .sc-meta { font-size:12px; color:var(--text-secondary); }
    .sc-inactive { font-size:11px; color:var(--warn,#c62828); font-weight:600; }
    .on-duty-chip { font-size:11px; font-weight:600; color:#2e7d32; background:#e8f5e9; border-radius:999px; padding:3px 10px; flex-shrink:0; }
  `],
})
export class StaffListComponent implements OnInit {
  private readonly staffSvc = inject(StaffService);
  private readonly auth     = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading   = signal(true);
  readonly actioning = signal<string | null>(null);
  readonly items     = signal<Staff[]>([]);
  readonly onDutyStaffIds = signal<Set<string>>(new Set());
  readonly isAdmin   = this.auth.isAdmin;
  readonly search    = signal('');

  readonly filtered = computed<Staff[]>(() => {
    const term = this.search().trim().toLowerCase();
    const list = this.items();
    if (!term) return list;
    return list.filter(s =>
      s.fn.toLowerCase().includes(term) ||
      s.ph.toLowerCase().includes(term)
    );
  });

  readonly groupedByCategory = computed<CategoryGroup[]>(() => {
    const byCategory = new Map<StaffCategory, Staff[]>();
    for (const s of this.filtered()) {
      if (!byCategory.has(s.cat)) byCategory.set(s.cat, []);
      byCategory.get(s.cat)!.push(s);
    }
    return CATEGORY_ORDER
      .filter(category => byCategory.has(category))
      .map(category => ({ category, staff: byCategory.get(category)! }));
  });

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }

    this.staffSvc.list(sid).subscribe({
      next: response => {
        this.items.set(response.items ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.staffSvc.onDuty(sid).subscribe({
      next: onDuty => this.onDutyStaffIds.set(new Set(onDuty.map(a => a.sid))),
      error: () => {},
    });
  }

  isOnDuty(staffId: string) {
    return this.onDutyStaffIds().has(staffId);
  }

  checkIn(staff: Staff) {
    const sid = this.auth.societyId();
    if (!sid) return;
    this.actioning.set(staff.id);
    this.staffSvc.checkIn(sid, staff.id).subscribe({
      next: () => {
        this.onDutyStaffIds.update(set => new Set(set).add(staff.id));
        this.actioning.set(null);
        this.snackBar.open(`${staff.fn} checked in.`, 'Dismiss', { duration: 3000 });
      },
      error: () => this.actioning.set(null),
    });
  }

  checkOut(staff: Staff) {
    const sid = this.auth.societyId();
    if (!sid) return;
    this.actioning.set(staff.id);
    this.staffSvc.checkOut(sid, staff.id).subscribe({
      next: () => {
        this.onDutyStaffIds.update(set => {
          const next = new Set(set);
          next.delete(staff.id);
          return next;
        });
        this.actioning.set(null);
        this.snackBar.open(`${staff.fn} checked out.`, 'Dismiss', { duration: 3000 });
      },
      error: () => this.actioning.set(null),
    });
  }

  deactivate(staff: Staff) {
    const sid = this.auth.societyId();
    if (!sid) return;
    if (!confirm(`Deactivate ${staff.fn}?`)) return;

    this.actioning.set(staff.id);
    this.staffSvc.deactivate(sid, staff.id).subscribe({
      next: () => {
        this.items.update(list => list.map(s => s.id === staff.id ? { ...s, ac: false } : s));
        this.actioning.set(null);
        this.snackBar.open('Staff member deactivated.', 'Dismiss', { duration: 3000 });
      },
      error: () => this.actioning.set(null),
    });
  }
}
