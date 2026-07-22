import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SosService } from '../../core/services/sos.service';
import { AuthService } from '../../core/services/auth.service';
import { SosAlert, SosAlertStatus, SOS_CATEGORY_LABELS } from '../../core/models/sos.model';

const STATUS_OPTIONS: (SosAlertStatus | '')[] = ['', 'Triggered', 'Acknowledged', 'Resolved', 'FalseAlarm'];

@Component({
  selector: 'app-sos-alert-list',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatSelectModule,
            PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="SOS Alerts">
      @if (isAdmin()) {
        <a actions routerLink="report" mat-button>Report</a>
      }
    </app-page-header>
    <div class="page-content">
      <div class="filters">
        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select [ngModel]="statusFilter()" (ngModelChange)="onStatusChange($event)">
            @for (s of statusOptions; track s) {
              <mat-option [value]="s">{{ s || 'All' }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (items().length === 0) {
        <app-empty-state icon="emergency" title="No SOS alerts" message="No alerts match the current filter."></app-empty-state>
      } @else {
        <div class="alert-list">
          @for (a of items(); track a.id) {
            <div class="alert-card" [class.alert-card--active]="a.st === 'Triggered'">
              <div class="alert-card__icon">
                <mat-icon>emergency</mat-icon>
              </div>
              <div class="alert-card__info">
                <span class="alert-card__title">{{ categoryLabel(a.cat) }} — {{ a.al }}</span>
                <span class="alert-card__meta">{{ a.un }} · {{ a.ta | date:'medium' }}</span>
                @if (a.nt) { <span class="alert-card__note">{{ a.nt }}</span> }
                @if (a.ec > 0) {
                  <span class="alert-card__escalated">Escalated {{ a.ec }}x</span>
                }
              </div>
              <span class="status-chip" [class]="'status-chip--' + a.st.toLowerCase()">{{ a.st }}</span>
              @if (canAct()) {
                @if (a.st === 'Triggered') {
                  <button mat-stroked-button color="primary" type="button" [disabled]="actioning() === a.id" (click)="acknowledge(a)">
                    Acknowledge
                  </button>
                }
                @if (a.st === 'Triggered' || a.st === 'Acknowledged') {
                  <button mat-stroked-button color="warn" type="button" [disabled]="actioning() === a.id" (click)="resolve(a)">
                    Resolve
                  </button>
                }
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .filters { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:16px; }
    .alert-list { display:flex; flex-direction:column; gap:8px; }
    .alert-card { display:flex; align-items:center; gap:12px; padding:12px; border:1px solid var(--border,#e0e0e0); border-radius:12px; flex-wrap:wrap; }
    .alert-card--active { border-color:#d32f2f; background:#ffebee; }
    .alert-card__icon mat-icon { color:#d32f2f; }
    .alert-card__info { display:flex; flex-direction:column; gap:2px; flex:1; min-width:180px; }
    .alert-card__title { font-weight:600; font-size:14px; }
    .alert-card__meta { font-size:12px; color:var(--text-secondary); }
    .alert-card__note { font-size:12px; font-style:italic; }
    .alert-card__escalated { font-size:11px; color:#e65100; font-weight:600; }
    .status-chip { font-size:11px; font-weight:600; border-radius:999px; padding:3px 10px; flex-shrink:0; }
    .status-chip--triggered { background:#ffebee; color:#c62828; }
    .status-chip--acknowledged { background:#fff8e1; color:#f57f17; }
    .status-chip--resolved { background:#e8f5e9; color:#2e7d32; }
    .status-chip--falsealarm { background:#eceff1; color:#546e7a; }
  `],
})
export class SosAlertListComponent implements OnInit {
  private readonly sosSvc = inject(SosService);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly statusOptions = STATUS_OPTIONS;
  readonly loading = signal(true);
  readonly actioning = signal<string | null>(null);
  readonly items = signal<SosAlert[]>([]);
  readonly statusFilter = signal<SosAlertStatus | ''>('');
  readonly isAdmin = this.auth.isAdmin;
  /** Only SUAdmin/SUSecurity can acknowledge/resolve — everyone else can view only. */
  readonly canAct  = computed(() => this.auth.isAdmin() || this.auth.isSecurity());

  categoryLabel(category: SosAlert['cat']) {
    return SOS_CATEGORY_LABELS[category];
  }

  ngOnInit() {
    this.load();
  }

  onStatusChange(status: SosAlertStatus | '') {
    this.statusFilter.set(status);
    this.load();
  }

  load() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }

    this.loading.set(true);
    this.sosSvc.list(sid, 1, 50, { status: this.statusFilter() }).subscribe({
      next: response => {
        this.items.set(response.items ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  acknowledge(alert: SosAlert) {
    const sid = this.auth.societyId();
    if (!sid) return;
    this.actioning.set(alert.id);
    this.sosSvc.acknowledge(sid, alert.id).subscribe({
      next: updated => {
        this.items.update(list => list.map(a => a.id === updated.id ? updated : a));
        this.actioning.set(null);
        this.snackBar.open('Alert acknowledged.', 'Dismiss', { duration: 3000 });
      },
      error: () => this.actioning.set(null),
    });
  }

  resolve(alert: SosAlert) {
    const sid = this.auth.societyId();
    if (!sid) return;
    this.actioning.set(alert.id);
    this.sosSvc.resolve(sid, alert.id).subscribe({
      next: updated => {
        this.items.update(list => list.map(a => a.id === updated.id ? updated : a));
        this.actioning.set(null);
        this.snackBar.open('Alert resolved.', 'Dismiss', { duration: 3000 });
      },
      error: () => this.actioning.set(null),
    });
  }
}
