import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { VisitorService } from '../../core/services/visitor.service';
import { AuthService } from '../../core/services/auth.service';
import { Visitor, VisitorStatus } from '../../core/models/visitor.model';
import { ApartmentService, UserService } from '../../core/services/apartment.service';

@Component({
  selector: 'app-visitor-list',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    PageHeaderComponent,
    StatusChipComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Visitor Log"
      [subtitle]="isAdmin() ? 'Run a search to load visitor records. Date defaults to today.' : 'Review approvals, pre-approved passes, and visitor history for your apartments.'">
      <div actions>
        <a routerLink="register" mat-flat-button color="primary">
          <mat-icon>add</mat-icon>
          {{ isAdmin() ? 'Register Visitor' : 'Create Pass' }}
        </a>
      </div>
    </app-page-header>

    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else {
        @if (actionLoading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

        @if (!isAdmin() && pendingApprovals().length) {
          <div class="card section-card">
            <div class="section-header">
              <h3>Pending Approvals</h3>
              <span>{{ pendingApprovals().length }}</span>
            </div>
            <div class="visitor-list">
              @for (visitor of pendingApprovals(); track visitor.id) {
                <div class="visitor-card">
                  <div class="vc-avatar">{{ visitor.visitorName[0] }}</div>
                  <div class="vc-info">
                    <span class="vc-name">{{ visitor.visitorName }}</span>
                    <span class="vc-purpose">{{ visitor.purpose }}</span>
                    <span class="vc-time">{{ visitor.createdAt | date:'medium' }}</span>
                  </div>
                  <div class="vc-right">
                    <app-status-chip [status]="visitor.status"></app-status-chip>
                    <div class="action-row compact">
                      <button mat-stroked-button color="primary" type="button" (click)="approve(visitor)">Approve</button>
                      <button mat-stroked-button color="warn" type="button" (click)="deny(visitor)">Deny</button>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <div class="card section-card">
          <div class="section-header">
            <h3>{{ isAdmin() ? 'Visitor History Search' : 'My Visitor History' }}</h3>
          </div>

          <div class="filter-grid">
            <mat-form-field appearance="fill">
              <mat-label>From</mat-label>
              <input matInput type="date" [(ngModel)]="filters.fromDate">
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>To</mat-label>
              <input matInput type="date" [(ngModel)]="filters.toDate">
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Apartment</mat-label>
              <select matNativeControl [(ngModel)]="filters.apartmentId">
                <option value="">All apartments</option>
                @for (option of apartmentOptions(); track option.id) {
                  <option [value]="option.id">{{ option.label }}</option>
                }
              </select>
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Visitor name</mat-label>
              <input matInput [(ngModel)]="filters.visitorName" placeholder="Search by visitor name">
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Status</mat-label>
              <select matNativeControl [(ngModel)]="filters.status">
                <option value="">All statuses</option>
                @for (status of statuses; track status) {
                  <option [value]="status">{{ status }}</option>
                }
              </select>
            </mat-form-field>
          </div>

          <div class="action-row">
            <button mat-flat-button color="primary" type="button" (click)="search()">Search</button>
            <button mat-stroked-button type="button" (click)="exportCsv()" [disabled]="items().length === 0">Export CSV</button>
          </div>
        </div>

        @if (isAdmin() && !searched()) {
          <app-empty-state icon="badge" title="Search visitor records" message="Use the filters above to load visitor logs for the society."></app-empty-state>
        } @else if (items().length === 0) {
          <app-empty-state icon="badge" title="No visitors found" message="No visitor records matched the current filters."></app-empty-state>
        } @else {
          <div class="visitor-list">
            @for (visitor of items(); track visitor.id) {
              <div class="visitor-card detailed">
                <div class="vc-avatar">{{ visitor.visitorName[0] }}</div>
                <div class="vc-info">
                  <span class="vc-name">{{ visitor.visitorName }}</span>
                  <span class="vc-purpose">{{ visitor.purpose }}</span>
                  <span class="vc-meta">
                    {{ visitor.hostApartmentNumber ?? 'General society visit' }}
                    @if (visitor.hostResidentName) { <span>&middot; {{ visitor.hostResidentName }}</span> }
                  </span>
                  <span class="vc-time">
                    Requested {{ visitor.createdAt | date:'medium' }}
                    @if (visitor.checkInTime) { <span>&middot; Check-in {{ visitor.checkInTime | date:'short' }}</span> }
                    @if (visitor.checkOutTime) { <span>&middot; Check-out {{ visitor.checkOutTime | date:'short' }}</span> }
                  </span>
                  <div class="pass-details">
                    <span>Pass Code: <strong>{{ visitor.passCode }}</strong></span>
                    @if (visitor.vehicleNumber) { <span>Vehicle: {{ visitor.vehicleNumber }}</span> }
                  </div>
                  @if (visitor.qrCode && visitor.status !== 'Pending' && visitor.status !== 'Denied') {
                    <div class="qr-inline">
                      <img [src]="qrCodeSrc(visitor.qrCode!)" alt="Visitor QR code">
                    </div>
                  }
                </div>
                <div class="vc-right">
                  <app-status-chip [status]="visitor.status"></app-status-chip>
                  <div class="action-row compact">
                    @if (visitor.canApprove) {
                      <button mat-stroked-button color="primary" type="button" (click)="approve(visitor)">Approve</button>
                      <button mat-stroked-button color="warn" type="button" (click)="deny(visitor)">Deny</button>
                    }
                    @if (visitor.canCheckIn) {
                      <button mat-stroked-button color="primary" type="button" (click)="checkin(visitor)">Check In</button>
                    }
                    @if (visitor.canCheckOut) {
                      <button mat-stroked-button type="button" (click)="checkout(visitor)">Check Out</button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styleUrl: './visitors.scss',
})
export class VisitorListComponent implements OnInit {
  private readonly visitorSvc = inject(VisitorService);
  private readonly auth = inject(AuthService);
  private readonly userSvc = inject(UserService);
  private readonly apartmentSvc = inject(ApartmentService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly actionLoading = signal(false);
  readonly items = signal<Visitor[]>([]);
  readonly pendingApprovals = signal<Visitor[]>([]);
  readonly apartmentOptions = signal<Array<{ id: string; label: string }>>([]);
  readonly searched = signal(false);
  readonly isAdmin = this.auth.isAdmin;
  readonly statuses: VisitorStatus[] = ['Pending', 'Approved', 'Denied', 'CheckedIn', 'CheckedOut'];

  readonly filters = {
    fromDate: this.today(),
    toDate: this.today(),
    apartmentId: '',
    visitorName: '',
    status: '' as VisitorStatus | '',
  };

  ngOnInit() {
    this.loadContext();
  }

  search() {
    const sid = this.auth.societyId();
    if (!sid) return;

    this.actionLoading.set(true);
    this.searched.set(true);

    const request = this.isAdmin()
      ? this.visitorSvc.list(sid, this.filters)
      : this.visitorSvc.listMine(sid, this.filters);

    request.subscribe({
      next: result => {
        this.items.set(result.items ?? []);
        this.actionLoading.set(false);
      },
      error: () => this.actionLoading.set(false),
    });
  }

  approve(visitor: Visitor) {
    const sid = this.auth.societyId();
    if (!sid) return;

    this.actionLoading.set(true);
    this.visitorSvc.approve(sid, visitor.id).subscribe({
      next: updated => {
        this.applyVisitorUpdate(updated);
        this.pendingApprovals.update(items => items.filter(item => item.id !== updated.id));
        this.actionLoading.set(false);
      },
      error: () => this.actionLoading.set(false),
    });
  }

  deny(visitor: Visitor) {
    const sid = this.auth.societyId();
    if (!sid) return;

    this.actionLoading.set(true);
    this.visitorSvc.deny(sid, visitor.id).subscribe({
      next: updated => {
        this.applyVisitorUpdate(updated);
        this.pendingApprovals.update(items => items.filter(item => item.id !== updated.id));
        this.actionLoading.set(false);
      },
      error: () => this.actionLoading.set(false),
    });
  }

  checkin(visitor: Visitor) {
    const sid = this.auth.societyId();
    if (!sid) return;

    this.actionLoading.set(true);
    this.visitorSvc.checkin(sid, visitor.id, visitor.passCode).subscribe({
      next: updated => {
        this.applyVisitorUpdate(updated);
        this.actionLoading.set(false);
      },
      error: () => this.actionLoading.set(false),
    });
  }

  checkout(visitor: Visitor) {
    const sid = this.auth.societyId();
    if (!sid) return;

    this.actionLoading.set(true);
    this.visitorSvc.checkout(sid, visitor.id).subscribe({
      next: updated => {
        this.applyVisitorUpdate(updated);
        this.actionLoading.set(false);
      },
      error: () => this.actionLoading.set(false),
    });
  }

  exportCsv() {
    const rows = [
      ['Visitor Name', 'Phone', 'Email', 'Purpose', 'Apartment', 'Resident', 'Status', 'Pass Code', 'Check In', 'Check Out', 'Requested At'],
      ...this.items().map(visitor => [
        visitor.visitorName,
        visitor.visitorPhone,
        visitor.visitorEmail ?? '',
        visitor.purpose,
        visitor.hostApartmentNumber ?? '',
        visitor.hostResidentName ?? '',
        visitor.status,
        visitor.passCode,
        visitor.checkInTime ?? '',
        visitor.checkOutTime ?? '',
        visitor.createdAt,
      ]),
    ];

    const csv = rows
      .map(columns => columns.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visitor-log-${this.filters.fromDate || this.today()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.snackBar.open('Visitor log exported.', 'Dismiss', { duration: 3000 });
  }

  qrCodeSrc(qrCode: string) {
    return qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`;
  }

  private loadContext() {
    const sid = this.auth.societyId();
    const currentUser = this.auth.user();
    if (!sid || !currentUser) {
      this.loading.set(false);
      return;
    }

    if (this.isAdmin()) {
      this.apartmentSvc.list(sid, 1, 500).subscribe({
        next: result => {
          this.apartmentOptions.set((result.items ?? []).map(apartment => ({
            id: apartment.id,
            label: apartment.blockName ? `${apartment.apartmentNumber} - ${apartment.blockName}` : apartment.apartmentNumber,
          })));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
      return;
    }

    this.userSvc.get(sid, currentUser.id).subscribe({
      next: user => {
        this.apartmentOptions.set((user.apartments ?? []).map(apartment => ({
          id: apartment.apartmentId,
          label: `${apartment.name} (${apartment.residentType})`,
        })));
        if (!this.filters.apartmentId && this.apartmentOptions().length > 0) {
          this.filters.apartmentId = this.apartmentOptions()[0].id;
        }
        this.loading.set(false);
        this.search();
        this.loadPendingApprovals();
      },
      error: () => this.loading.set(false),
    });
  }

  private loadPendingApprovals() {
    const sid = this.auth.societyId();
    if (!sid || this.isAdmin()) return;

    this.visitorSvc.listPendingApprovals(sid, 1, 20).subscribe({
      next: result => this.pendingApprovals.set(result.items ?? []),
    });
  }

  private applyVisitorUpdate(updated: Visitor) {
    this.items.update(items => {
      const index = items.findIndex(item => item.id === updated.id);
      if (index === -1) return items;
      const copy = [...items];
      copy[index] = updated;
      return copy;
    });
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }
}
