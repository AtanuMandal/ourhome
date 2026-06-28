import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Visitor, VisitorListFilters, VisitorStatus } from '../../core/models/visitor.model';
import { AuthService } from '../../core/services/auth.service';
import { VisitorService } from '../../core/services/visitor.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';

@Component({
  selector: 'app-visitor-list',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    PageHeaderComponent,
    StatusChipComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent
  ],
  template: `
    <app-page-header title="Visitors"></app-page-header>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    <div class="page-content visitors-page">
      @if (errorMessage()) {
        <div class="card error-banner">{{ errorMessage() }}</div>
      }

      <div class="card filters-card">
        <div class="filters-card__header">
          <div>
            <h3>Visitor history</h3>
            <p>Search by visitor name, resident, date, or status.</p>
          </div>
          @if (isAdmin()) {
            <button mat-stroked-button color="primary" type="button" (click)="exportCsv()">
              <mat-icon>download</mat-icon>
              Export CSV
            </button>
          }
        </div>

        <form [formGroup]="filtersForm" class="filters-grid">
          <mat-form-field appearance="fill">
            <mat-label>Search</mat-label>
            <input matInput formControlName="search" placeholder="Visitor, company, purpose, flat">
          </mat-form-field>

          @if (isAdmin()) {
            <mat-form-field appearance="fill">
              <mat-label>Resident</mat-label>
              <input matInput formControlName="residentName" placeholder="Resident name">
            </mat-form-field>
          }

          <mat-form-field appearance="fill">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="">All</mat-option>
              @for (status of statuses; track status) {
                <mat-option [value]="status">{{ status }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>From date</mat-label>
            <input matInput type="date" formControlName="fromDate">
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>To date</mat-label>
            <input matInput type="date" formControlName="toDate">
          </mat-form-field>
        </form>

        <div class="filters-card__actions">
          <button mat-stroked-button type="button" (click)="resetFilters()">Reset</button>
          <button mat-raised-button color="primary" type="button" (click)="loadVisitors()">Apply filters</button>
        </div>
      </div>

      @if (isAdmin()) {
        <div class="card verify-card">
          <div class="verify-card__header">
            <div>
              <h3>Pass verification</h3>
              <p>Enter the QR/pass code to verify and check the visitor in.</p>
            </div>
          </div>

          <form [formGroup]="verifyForm" class="verify-card__form">
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Pass code</mat-label>
              <input matInput formControlName="passCode" placeholder="Scan or enter the code">
            </mat-form-field>

            <div class="verify-card__actions">
              <button mat-stroked-button color="primary" type="button" (click)="verifyPass()">Verify</button>
              <button
                mat-raised-button
                color="primary"
                type="button"
                [disabled]="!verifiedVisitor() || verifiedVisitor()!.status !== 'Approved'"
                (click)="checkInVerifiedVisitor()">
                Check in visitor
              </button>
            </div>
          </form>

          @if (verifiedVisitor()) {
            <div class="verify-card__result">
              <div>
                <strong>{{ verifiedVisitor()!.visitorName }}</strong>
                <p>{{ verifiedVisitor()!.purpose }} for {{ verifiedVisitor()!.hostFlatNumber }}</p>
              </div>
              <app-status-chip [status]="verifiedVisitor()!.status"></app-status-chip>
            </div>
          }
        </div>
      }

      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (items().length === 0) {
        <app-empty-state icon="badge" title="No visitors" message="No visitor records match the selected filters.">
          <a routerLink="register" mat-stroked-button color="primary" style="margin-top:16px">Register visitor</a>
        </app-empty-state>
      } @else {
        <div class="visitor-list">
          @for (visitor of items(); track visitor.id) {
            <div class="visitor-card">
              <div class="vc-avatar">{{ visitor.visitorName[0] }}</div>

              <div class="vc-info">
                <div class="vc-title-row">
                  <span class="vc-name">{{ visitor.visitorName }}</span>
                  @if (visitor.companyName) {
                    <span class="vc-company">{{ visitor.companyName }}</span>
                  }
                </div>

                <span class="vc-purpose">{{ visitor.purpose }}</span>
                <span class="vc-meta">
                  {{ visitor.hostBlockName }} {{ visitor.hostFloorNumber }}-{{ visitor.hostFlatNumber }}
                  - {{ visitor.hostResidentName }}
                </span>
                <span class="vc-meta">{{ visitor.visitorPhone }}{{ visitor.vehicleNumber ? ' - ' + visitor.vehicleNumber : '' }}</span>
                <span class="vc-time">
                  Requested {{ visitor.createdAt | date:'medium' }}{{ visitor.checkInTime ? ' - Checked in ' + (visitor.checkInTime | date:'short') : '' }}{{ visitor.checkOutTime ? ' - Checked out ' + (visitor.checkOutTime | date:'short') : '' }}
                </span>

                @if (visitor.status === 'Approved' || visitor.status === 'CheckedIn') {
                  <div class="pass-meta">
                    <span>Pass: <strong>{{ visitor.passCode }}</strong></span>
                    @if (visitor.isPreApproved) {
                      <span class="pass-meta__pill">Pre-approved</span>
                    }
                  </div>
                }
              </div>

              <div class="vc-right">
                <app-status-chip [status]="visitor.status"></app-status-chip>

                <div class="vc-actions">
                  @if (visitor.status === 'Pending' && canModerate(visitor)) {
                    <button mat-stroked-button color="primary" type="button" (click)="approve(visitor)">Approve</button>
                    <button mat-stroked-button color="warn" type="button" (click)="deny(visitor)">Deny</button>
                  }

                  @if (visitor.status === 'CheckedIn' && isAdmin()) {
                    <button mat-stroked-button color="primary" type="button" (click)="checkout(visitor)">Check out</button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <a routerLink="register" mat-fab color="primary" class="fab" aria-label="Register visitor">
      <mat-icon>person_add</mat-icon>
    </a>
  `,
  styleUrl: './visitors.scss'
})
export class VisitorListComponent implements OnInit {
  private readonly visitorService = inject(VisitorService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly items = signal<Visitor[]>([]);
  readonly errorMessage = signal('');
  readonly verifiedVisitor = signal<Visitor | null>(null);
  readonly isAdmin = this.auth.isAdmin;
  readonly residentApartmentId = computed(() => this.auth.user()?.apartmentId ?? this.auth.user()?.apartments?.[0]?.apartmentId ?? '');
  readonly statuses: VisitorStatus[] = ['Pending', 'Approved', 'Denied', 'CheckedIn', 'CheckedOut'];

  readonly filtersForm = this.fb.group({
    search: [''],
    residentName: [''],
    status: [''],
    fromDate: [''],
    toDate: ['']
  });

  readonly verifyForm = this.fb.group({
    passCode: ['']
  });

  ngOnInit(): void {
    this.loadVisitors();
  }

  loadVisitors() {
    const societyId = this.auth.societyId();
    if (!societyId) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.visitorService.list(societyId, 1, 100, this.buildFilters()).subscribe({
      next: response => {
        this.items.set(response.items ?? []);
        this.loading.set(false);
      },
      error: error => {
        this.errorMessage.set(error?.error?.message ?? 'Unable to load visitors right now.');
        this.loading.set(false);
      }
    });
  }

  resetFilters() {
    this.filtersForm.reset({
      search: '',
      residentName: '',
      status: '',
      fromDate: '',
      toDate: ''
    });
    this.loadVisitors();
  }

  approve(visitor: Visitor) {
    const societyId = this.auth.societyId();
    if (!societyId) {
      return;
    }

    this.visitorService.approve(societyId, visitor.id).subscribe({
      next: () => this.loadVisitors(),
      error: error => this.errorMessage.set(error?.error?.message ?? 'Unable to approve the visitor.')
    });
  }

  deny(visitor: Visitor) {
    const societyId = this.auth.societyId();
    if (!societyId) {
      return;
    }

    this.visitorService.deny(societyId, visitor.id).subscribe({
      next: () => this.loadVisitors(),
      error: error => this.errorMessage.set(error?.error?.message ?? 'Unable to deny the visitor.')
    });
  }

  checkout(visitor: Visitor) {
    const societyId = this.auth.societyId();
    if (!societyId) {
      return;
    }

    this.visitorService.checkout(societyId, visitor.id).subscribe({
      next: () => this.loadVisitors(),
      error: error => this.errorMessage.set(error?.error?.message ?? 'Unable to check out the visitor.')
    });
  }

  verifyPass() {
    const societyId = this.auth.societyId();
    const passCode = this.verifyForm.controls.passCode.value?.trim();
    if (!societyId || !passCode) {
      return;
    }

    this.visitorService.verify(societyId, passCode).subscribe({
      next: visitor => {
        this.verifiedVisitor.set(visitor);
        this.errorMessage.set('');
      },
      error: error => {
        this.verifiedVisitor.set(null);
        this.errorMessage.set(error?.error?.message ?? 'Unable to verify the pass code.');
      }
    });
  }

  checkInVerifiedVisitor() {
    const societyId = this.auth.societyId();
    const passCode = this.verifyForm.controls.passCode.value?.trim();
    if (!societyId || !passCode) {
      return;
    }

    this.visitorService.checkin(societyId, passCode).subscribe({
      next: visitor => {
        this.verifiedVisitor.set(visitor);
        this.loadVisitors();
      },
      error: error => this.errorMessage.set(error?.error?.message ?? 'Unable to check in the visitor.')
    });
  }

  exportCsv() {
    const societyId = this.auth.societyId();
    if (!societyId) {
      return;
    }

    this.visitorService.export(societyId, this.buildFilters()).subscribe({
      next: response => {
        const blob = response.body;
        if (!blob) {
          return;
        }

        const disposition = response.headers.get('content-disposition') ?? '';
        const match = disposition.match(/filename="?([^"]+)"?/i);
        const fileName = match?.[1] ?? 'visitor-log.csv';
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: error => this.errorMessage.set(error?.error?.message ?? 'Unable to export visitor data.')
    });
  }

  canModerate(visitor: Visitor) {
    if (this.isAdmin()) {
      return true;
    }

    const apartmentId = this.residentApartmentId();
    return !!apartmentId && apartmentId === visitor.hostApartmentId;
  }

  private buildFilters(): VisitorListFilters {
    const formValue = this.filtersForm.getRawValue();
    return {
      apartmentId: this.isAdmin() ? undefined : this.residentApartmentId(),
      search: formValue.search?.trim() ?? '',
      residentName: this.isAdmin() ? formValue.residentName?.trim() ?? '' : '',
      status: (formValue.status as VisitorStatus | '') ?? '',
      fromDate: formValue.fromDate ?? '',
      toDate: formValue.toDate ?? ''
    };
  }
}
