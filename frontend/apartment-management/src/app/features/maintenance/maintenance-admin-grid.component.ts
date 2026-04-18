import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { MaintenanceChargeGrid, MaintenanceGridCharge } from '../../core/models/maintenance.model';
import { AuthService } from '../../core/services/auth.service';
import { MaintenanceService } from '../../core/services/maintenance.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { MAINTENANCE_PAGE_STYLES, MONTH_OPTIONS } from './maintenance-shared';

@Component({
  selector: 'app-maintenance-admin-grid',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
    PageHeaderComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    StatusChipComponent,
  ],
  template: `
    <app-page-header
      title="Maintenance payment grid"
      subtitle="Month-wise maintenance status for every apartment"
      [showBack]="true">
    </app-page-header>

    <div class="page-content">
      <section class="card card--spaced">
        <div class="section-header">
          <div>
            <h2 class="section-title">Filters</h2>
            <p class="section-copy">Review apartment-wise maintenance charges by month and process payments from the same view.</p>
          </div>
          <button mat-stroked-button color="primary" routerLink="/maintenance/admin" type="button">
            Back to schedule list
          </button>
        </div>

        <form [formGroup]="filterForm" class="filters">
          <mat-form-field appearance="fill">
            <mat-label>Year</mat-label>
            <select matNativeControl formControlName="year" (change)="loadGrid()">
              @for (year of yearOptions(); track year) {
                <option [ngValue]="year">{{ year }}</option>
              }
            </select>
          </mat-form-field>
        </form>
      </section>

      <section class="card card--spaced">
        <div class="section-header">
          <div>
            <h2 class="section-title">Admin payment details</h2>
            <p class="section-copy">These values are applied when approving a proof or marking a charge paid from the grid.</p>
          </div>
        </div>

        <form [formGroup]="settlementForm" class="stack">
          <div class="two-col">
            <mat-form-field appearance="fill">
              <mat-label>Payment method</mat-label>
              <input matInput formControlName="paymentMethod">
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Transaction reference</mat-label>
              <input matInput formControlName="transactionReference">
            </mat-form-field>
          </div>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Receipt URL</mat-label>
            <input matInput formControlName="receiptUrl" placeholder="https://...">
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Notes</mat-label>
            <textarea matInput rows="2" formControlName="notes"></textarea>
          </mat-form-field>
        </form>
      </section>

      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (grid()?.rows?.length) {
        <section class="card card--spaced">
          <div class="section-header">
            <div>
              <h2 class="section-title">Apartment payment grid</h2>
              <p class="section-copy">Apartments are listed on the Y axis and months on the X axis for {{ filterForm.controls.year.value }}.</p>
            </div>
          </div>

          <div class="grid-shell">
            <table class="payment-grid">
              <thead>
                <tr>
                  <th>Apartment / Resident</th>
                  @for (month of monthHeaders(); track month.value) {
                    <th>{{ month.label }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of grid()!.rows; track row.apartmentId) {
                  <tr>
                    <td class="row-header">
                      <div class="row-title">{{ row.apartmentNumber }}</div>
                      <div class="section-copy">{{ row.residentName || 'Unassigned' }}</div>
                    </td>
                    @for (cell of row.months; track cell.month) {
                      <td class="month-cell">
                        @if (cell.charges.length) {
                          <div class="stack">
                            @for (charge of cell.charges; track charge.id) {
                              <div class="grid-charge" [class.grid-charge--overdue]="charge.isOverdue">
                                <div class="grid-charge__header">
                                  <div class="grid-charge__title">{{ charge.scheduleName }}</div>
                                  <app-status-chip [status]="charge.status"></app-status-chip>
                                </div>
                                <div class="section-copy">{{ charge.amount | currency:'INR':'symbol':'1.2-2' }} · Due {{ charge.dueDate | date:'mediumDate' }}</div>
                                @if (charge.transactionReference) {
                                  <div class="section-copy">Ref: {{ charge.transactionReference }}</div>
                                }
                                @if (charge.proofs.length) {
                                  <div class="proof-list">
                                    @for (proof of charge.proofs; track proof.proofUrl + proof.submittedAt) {
                                      <div class="proof-item">
                                        <a [href]="proof.proofUrl" target="_blank" rel="noreferrer">{{ proof.proofUrl }}</a>
                                        <span>{{ proof.submittedAt | date:'medium' }}</span>
                                        @if (proof.notes) {
                                          <span>{{ proof.notes }}</span>
                                        }
                                      </div>
                                    }
                                  </div>
                                }
                                <div class="action-row action-row--compact">
                                  @if (charge.status === 'ProofSubmitted') {
                                    <button mat-raised-button color="primary" type="button"
                                      [disabled]="processingChargeId() === charge.id || settlementForm.invalid"
                                      (click)="approveProof(charge)">
                                      Approve
                                    </button>
                                  }
                                  @if (charge.status !== 'Paid') {
                                    <button mat-stroked-button color="primary" type="button"
                                      [disabled]="processingChargeId() === charge.id || settlementForm.invalid"
                                      (click)="markPaid(charge)">
                                      Mark paid
                                    </button>
                                  }
                                </div>
                              </div>
                            }
                          </div>
                        } @else {
                          <span class="section-copy">No charge</span>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      } @else {
        <app-empty-state
          icon="receipt_long"
          title="No grid data found"
          message="There are no maintenance charges for the selected year yet.">
        </app-empty-state>
      }
    </div>
  `,
  styles: [MAINTENANCE_PAGE_STYLES + `
    .grid-shell { overflow-x: auto; }
    .payment-grid { width: 100%; min-width: 1280px; border-collapse: separate; border-spacing: 0; }
    .payment-grid th, .payment-grid td { border: 1px solid var(--border); vertical-align: top; padding: 12px; background: white; }
    .payment-grid th { position: sticky; top: 0; background: #f8fafc; z-index: 1; text-align: left; }
    .row-header { min-width: 180px; background: #f8fafc; }
    .row-title { font-weight: 600; }
    .month-cell { min-width: 240px; background: #fcfcfd; }
    .grid-charge { border: 1px solid var(--border); border-radius: 10px; padding: 10px; background: white; }
    .grid-charge--overdue { border-color: #ef9a9a; background: #fff7f7; }
    .grid-charge__header { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
    .grid-charge__title { font-weight: 600; font-size: 13px; }
  `],
})
export class MaintenanceAdminGridComponent {
  private readonly auth = inject(AuthService);
  private readonly maintenance = inject(MaintenanceService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly processingChargeId = signal<string | null>(null);
  readonly grid = signal<MaintenanceChargeGrid | null>(null);

  readonly filterForm = this.fb.group({
    year: [new Date().getFullYear(), [Validators.required, Validators.min(2000)]],
  });

  readonly settlementForm = this.fb.group({
    paymentMethod: ['Manual', Validators.required],
    transactionReference: [''],
    receiptUrl: [''],
    notes: [''],
  });

  readonly yearOptions = computed(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  });

  readonly monthHeaders = computed(() => {
    const months = this.grid()?.months ?? [];
    return MONTH_OPTIONS.filter(month => months.includes(month.value));
  });

  constructor() {
    this.loadGrid();
  }

  loadGrid() {
    const societyId = this.auth.societyId();
    if (!societyId) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.maintenance.getChargeGrid(societyId, this.filterForm.controls.year.value ?? new Date().getFullYear()).subscribe({
      next: grid => {
        this.grid.set(grid);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  approveProof(charge: MaintenanceGridCharge) {
    this.processCharge(charge.id, () => this.maintenance.approveProof(this.auth.societyId()!, charge.id, this.settlementPayload()), 'Maintenance proof approved.');
  }

  markPaid(charge: MaintenanceGridCharge) {
    this.processCharge(charge.id, () => this.maintenance.markPaid(this.auth.societyId()!, charge.id, this.settlementPayload()), 'Maintenance charge marked as paid.');
  }

  private settlementPayload() {
    const formValue = this.settlementForm.getRawValue();
    return {
      paymentMethod: formValue.paymentMethod?.trim() || 'Manual',
      transactionReference: formValue.transactionReference?.trim() || null,
      receiptUrl: formValue.receiptUrl?.trim() || null,
      notes: formValue.notes?.trim() || null,
    };
  }

  private processCharge(chargeId: string, requestFactory: () => Observable<boolean>, successMessage: string) {
    if (this.settlementForm.invalid) return;

    this.processingChargeId.set(chargeId);
    requestFactory().subscribe({
      next: () => {
        this.processingChargeId.set(null);
        this.loadGrid();
        this.snackBar.open(successMessage, 'Dismiss', { duration: 4000 });
      },
      error: () => this.processingChargeId.set(null),
    });
  }
}
