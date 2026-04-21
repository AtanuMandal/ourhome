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
            <p class="section-copy">Review apartment-wise maintenance charges by month, quarter, or year and process payments from the same view.</p>
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

          <mat-form-field appearance="fill">
            <mat-label>View</mat-label>
            <select matNativeControl formControlName="periodView">
              @for (view of periodViewOptions; track view.value) {
                <option [ngValue]="view.value">{{ view.label }}</option>
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

      <section class="card card--spaced">
        <div class="section-header">
          <div>
            <h2 class="section-title">Create penalty charge</h2>
            <p class="section-copy">Add a one-off late-payment penalty for a specific apartment.</p>
          </div>
        </div>

        <form [formGroup]="penaltyForm" class="stack" (ngSubmit)="createPenalty()">
          <div class="two-col">
            <mat-form-field appearance="fill">
              <mat-label>Apartment</mat-label>
              <select matNativeControl formControlName="apartmentId">
                <option [ngValue]="''">Select apartment</option>
                @for (apartment of apartmentOptions(); track apartment.id) {
                  <option [ngValue]="apartment.id">{{ apartment.label }}</option>
                }
              </select>
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Penalty amount</mat-label>
              <input matInput type="number" min="0.01" step="0.01" formControlName="amount">
            </mat-form-field>
          </div>

          <div class="two-col">
            <mat-form-field appearance="fill">
              <mat-label>Due date</mat-label>
              <input matInput type="date" formControlName="dueDate">
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Reason</mat-label>
              <input matInput formControlName="reason" maxlength="200">
            </mat-form-field>
          </div>

          <div class="action-row">
            <button mat-raised-button color="primary" type="submit" [disabled]="creatingPenalty() || penaltyForm.invalid">
              Create penalty
            </button>
          </div>
        </form>
      </section>

      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (grid()?.rows?.length) {
        <section class="card card--spaced">
          <div class="section-header">
            <div>
              <h2 class="section-title">Apartment payment grid</h2>
              <p class="section-copy">Apartments are listed on the Y axis and {{ viewDescriptor() }} for {{ filterForm.controls.year.value }}.</p>
            </div>
          </div>

          <div class="grid-shell">
            <table class="payment-grid">
              <thead>
                <tr>
                  <th>Apartment / Resident</th>
                  @for (period of displayPeriods(); track period.key) {
                    <th>{{ period.label }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of displayRows(); track row.apartmentId) {
                  <tr>
                    <td class="row-header">
                      <div class="row-title">{{ row.apartmentNumber }}</div>
                      <div class="section-copy">{{ row.residentName || 'Unassigned' }}</div>
                      <div class="action-row action-row--compact">
                        <button mat-stroked-button color="primary" type="button" (click)="prefillPenalty(row.apartmentId)">
                          Add penalty
                        </button>
                      </div>
                    </td>
                    @for (cell of row.periods; track cell.key) {
                      <td class="month-cell">
                        @if (cell.charges.length) {
                          <div class="stack">
                            <div class="section-copy">
                              Total: {{ cell.totalAmount | currency:'INR':'symbol':'1.2-2' }}
                              @if (cell.hasOverdue) {
                                <span class="text-danger"> · Overdue present</span>
                              }
                            </div>
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
                                <div class="action-row action-row--compact">
                                  @if (hasSupportingDocs(charge)) {
                                    <button mat-stroked-button type="button" (click)="openProofDialog(charge)">
                                      View proofs
                                    </button>
                                  }
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

      @if (proofCharge(); as selectedCharge) {
        <div class="dialog-backdrop" (click)="closeProofDialog()">
          <div class="dialog-card" (click)="$event.stopPropagation()">
            <div class="section-header section-header--compact">
              <div>
                <h2 class="section-title">{{ selectedCharge.scheduleName }}</h2>
                <p class="section-copy">{{ selectedCharge.amount | currency:'INR':'symbol':'1.2-2' }} · Due {{ selectedCharge.dueDate | date:'mediumDate' }}</p>
              </div>
              <button mat-stroked-button type="button" (click)="closeProofDialog()">Close</button>
            </div>

            @if (selectedCharge.receiptUrl) {
              <div class="proof-item">
                <span class="proof-list__title">Receipt</span>
                <a [href]="selectedCharge.receiptUrl" target="_blank" rel="noreferrer">{{ selectedCharge.receiptUrl }}</a>
              </div>
            }

            @if (selectedCharge.notes) {
              <div class="proof-item">
                <span class="proof-list__title">Notes</span>
                <span>{{ selectedCharge.notes }}</span>
              </div>
            }

            @if (selectedCharge.proofs.length) {
              <div class="proof-list">
                <span class="proof-list__title">Proof uploads</span>
                @for (proof of selectedCharge.proofs; track proof.proofUrl + proof.submittedAt) {
                  <div class="proof-item">
                    <a [href]="proof.proofUrl" target="_blank" rel="noreferrer">{{ proof.proofUrl }}</a>
                    <span>{{ proof.submittedAt | date:'medium' }}</span>
                    @if (proof.notes) {
                      <span>{{ proof.notes }}</span>
                    }
                  </div>
                }
              </div>
            } @else {
              <div class="section-copy">No resident proof has been uploaded for this charge.</div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [MAINTENANCE_PAGE_STYLES + `
    .grid-shell {
      overflow-x: auto;
      overflow-y: scroll;
      max-height: calc(100vh - 260px);
      scrollbar-gutter: stable;
    }
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
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      z-index: 1000;
    }
    .dialog-card {
      width: min(720px, 100%);
      max-height: calc(100vh - 48px);
      overflow: auto;
      background: white;
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2);
    }
  `],
})
export class MaintenanceAdminGridComponent {
  private readonly auth = inject(AuthService);
  private readonly maintenance = inject(MaintenanceService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly processingChargeId = signal<string | null>(null);
  readonly creatingPenalty = signal(false);
  readonly grid = signal<MaintenanceChargeGrid | null>(null);
  readonly proofCharge = signal<MaintenanceGridCharge | null>(null);

  readonly filterForm = this.fb.group({
    year: [new Date().getFullYear(), [Validators.required, Validators.min(2000)]],
    periodView: ['Month' as GridPeriodView, Validators.required],
  });

  readonly settlementForm = this.fb.group({
    paymentMethod: ['Manual', Validators.required],
    transactionReference: [''],
    receiptUrl: [''],
    notes: [''],
  });

  readonly penaltyForm = this.fb.group({
    apartmentId: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    dueDate: [this.toDateInputValue(new Date()), Validators.required],
    reason: ['', [Validators.required, Validators.maxLength(200)]],
  });

  readonly periodViewOptions = [
    { value: 'Month' as GridPeriodView, label: 'Month' },
    { value: 'Quarter' as GridPeriodView, label: 'Quarter' },
    { value: 'Year' as GridPeriodView, label: 'Year' },
  ];

  readonly yearOptions = computed(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  });

  readonly apartmentOptions = computed(() =>
    (this.grid()?.rows ?? [])
      .map(row => ({
        id: row.apartmentId,
        label: `${row.apartmentNumber}${row.residentName ? ` · ${row.residentName}` : ''}`,
      }))
      .sort((left, right) => left.label.localeCompare(right.label))
  );

  readonly displayPeriods = computed<GridDisplayPeriod[]>(() => {
    const months = this.grid()?.months ?? [];
    const periodView = this.filterForm.controls.periodView.value ?? 'Month';

    if (periodView === 'Quarter') {
      return [
        { key: 'Q1', label: 'Q1', months: [1, 2, 3] },
        { key: 'Q2', label: 'Q2', months: [4, 5, 6] },
        { key: 'Q3', label: 'Q3', months: [7, 8, 9] },
        { key: 'Q4', label: 'Q4', months: [10, 11, 12] },
      ].filter(period => period.months.some(month => months.includes(month)));
    }

    if (periodView === 'Year') {
      return [{ key: 'YEAR', label: 'Full year', months: months.slice() }];
    }

    return MONTH_OPTIONS
      .filter(month => months.includes(month.value))
      .map(month => ({ key: `M${month.value}`, label: month.label, months: [month.value] }));
  });

  readonly displayRows = computed<GridDisplayRow[]>(() =>
    (this.grid()?.rows ?? []).map(row => ({
      apartmentId: row.apartmentId,
      apartmentNumber: row.apartmentNumber,
      residentName: row.residentName,
      periods: this.displayPeriods().map(period => {
        const cells = row.months.filter(cell => period.months.includes(cell.month));
        const charges = cells.flatMap(cell => cell.charges);
        return {
          key: `${row.apartmentId}-${period.key}`,
          label: period.label,
          totalAmount: charges.reduce((sum, charge) => sum + charge.amount, 0),
          hasOverdue: charges.some(charge => charge.isOverdue),
          charges,
        };
      }),
    }))
  );

  readonly viewDescriptor = computed(() => {
    switch (this.filterForm.controls.periodView.value) {
      case 'Quarter':
        return 'quarters on the X axis';
      case 'Year':
        return 'the year summary on the X axis';
      default:
        return 'months on the X axis';
    }
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

  hasSupportingDocs(charge: MaintenanceGridCharge) {
    return !!charge.receiptUrl || !!charge.notes || charge.proofs.length > 0;
  }

  openProofDialog(charge: MaintenanceGridCharge) {
    this.proofCharge.set(charge);
  }

  closeProofDialog() {
    this.proofCharge.set(null);
  }

  prefillPenalty(apartmentId: string) {
    this.penaltyForm.patchValue({ apartmentId });
  }

  createPenalty() {
    if (this.penaltyForm.invalid || !this.auth.societyId()) {
      return;
    }

    const formValue = this.penaltyForm.getRawValue();
    this.creatingPenalty.set(true);
    this.maintenance.createPenaltyCharge(this.auth.societyId()!, {
      apartmentId: formValue.apartmentId || '',
      amount: Number(formValue.amount),
      dueDate: formValue.dueDate || this.toDateInputValue(new Date()),
      reason: formValue.reason?.trim() || '',
    }).subscribe({
      next: () => {
        this.creatingPenalty.set(false);
        this.penaltyForm.patchValue({
          amount: null,
          reason: '',
          dueDate: this.toDateInputValue(new Date()),
        });
        this.loadGrid();
        this.snackBar.open('Penalty charge created.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.creatingPenalty.set(false),
    });
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

  private toDateInputValue(value: Date) {
    return value.toISOString().slice(0, 10);
  }
}

type GridPeriodView = 'Month' | 'Quarter' | 'Year';

interface GridDisplayPeriod {
  key: string;
  label: string;
  months: number[];
}

interface GridDisplayRow {
  apartmentId: string;
  apartmentNumber: string;
  residentName?: string | null;
  periods: {
    key: string;
    label: string;
    totalAmount: number;
    hasOverdue: boolean;
    charges: MaintenanceGridCharge[];
  }[];
}
