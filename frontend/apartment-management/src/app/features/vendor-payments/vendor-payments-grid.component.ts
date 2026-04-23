import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { VendorChargeGrid, VendorGridCharge } from '../../core/models/vendor-payment.model';
import { VendorPaymentService } from '../../core/services/vendor-payment.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { VENDOR_PAGE_STYLES, monthLabel } from './vendor-payments-shared';

@Component({
  selector: 'app-vendor-payments-grid',
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
      title="Vendor payment grid"
      subtitle="Month-wise vendor cost view with paid and due totals"
      [showBack]="true">
    </app-page-header>

    <div class="page-content">
      <section class="card card--spaced">
        <div class="section-header">
          <div>
            <h2 class="section-title">Filters</h2>
            <p class="section-copy">Vendors are on the Y axis and months are on the X axis.</p>
          </div>
          <button mat-stroked-button color="primary" routerLink="/vendor-payments" type="button">Back to vendor setup</button>
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

      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (grid()?.rows?.length) {
        <section class="card card--spaced">
          <div class="section-header">
            <div>
              <h2 class="section-title">Vendor cost matrix</h2>
              <p class="section-copy">Red cells indicate overdue costs that have crossed the configured vendor due-day window.</p>
            </div>
          </div>

          <div class="grid-shell">
            <table class="payment-grid">
              <thead>
                <tr>
                  <th>Vendor</th>
                  @for (month of grid()!.months; track month) {
                    <th>{{ monthLabel(month) }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of grid()!.rows; track row.vendorId) {
                  <tr>
                    <td class="row-header">
                      <div class="vendor-card__title">{{ row.vendorName }}</div>
                      <div class="section-copy">{{ row.businessType || 'Business type not set' }}</div>
                    </td>
                    @for (cell of row.months; track cell.month) {
                      <td class="month-cell">
                        @if (cell.charges.length) {
                          <div class="stack">
                            <div class="section-copy">
                              Total {{ cell.totalAmount | currency:'INR':'symbol':'1.2-2' }}
                              · Paid {{ cell.paidAmount | currency:'INR':'symbol':'1.2-2' }}
                              · Due {{ cell.dueAmount | currency:'INR':'symbol':'1.2-2' }}
                              @if (cell.hasOverdue) {
                                <span class="text-danger"> · Overdue present</span>
                              }
                            </div>
                            @for (charge of cell.charges; track charge.id) {
                              <div class="charge-card" [class.charge-card--overdue]="charge.isOverdue">
                                <div class="charge-card__title">{{ charge.description }}</div>
                                <div class="charge-card__meta">
                                  <span>{{ charge.amount | currency:'INR':'symbol':'1.2-2' }} · {{ charge.chargeType }}</span>
                                  <span>Effective {{ charge.effectiveDate | date:'mediumDate' }} · Due {{ charge.dueDate | date:'mediumDate' }}</span>
                                </div>
                                <div class="action-row">
                                  <app-status-chip [status]="charge.status"></app-status-chip>
                                  <app-status-chip [status]="charge.isActive ? 'Active' : 'Inactive'"></app-status-chip>
                                  @if (charge.receiptUrl) {
                                    <a class="inline-link" [href]="charge.receiptUrl" target="_blank" rel="noreferrer">Receipt</a>
                                  }
                                </div>
                                <div class="action-row action-row--compact">
                                  @if (charge.status !== 'Paid') {
                                    <button mat-stroked-button color="primary" type="button"
                                      [disabled]="processingChargeId() === charge.id || !charge.isActive"
                                      (click)="openPaymentPopup(charge)">
                                      Pay
                                    </button>
                                  }
                                  @if (charge.isActive) {
                                    <button mat-stroked-button type="button" [disabled]="processingChargeId() === charge.id" (click)="inactivateCharge(charge)">Inactivate</button>
                                  } @else {
                                    <button mat-stroked-button color="primary" type="button" [disabled]="processingChargeId() === charge.id" (click)="activateCharge(charge)">Activate</button>
                                  }
                                  <button mat-stroked-button color="warn" type="button" [disabled]="processingChargeId() === charge.id" (click)="deleteCharge(charge)">Delete</button>
                                </div>
                              </div>
                            }
                          </div>
                        } @else {
                          <span class="section-copy">No cost</span>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr>
                  <th>Monthly totals</th>
                  @for (total of grid()!.totals; track total.month) {
                    <th>
                      <div class="section-copy">Total {{ total.totalAmount | currency:'INR':'symbol':'1.2-2' }}</div>
                      <div class="section-copy">Paid {{ total.paidAmount | currency:'INR':'symbol':'1.2-2' }}</div>
                      <div class="section-copy">Due {{ total.dueAmount | currency:'INR':'symbol':'1.2-2' }}</div>
                    </th>
                  }
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      } @else {
        <app-empty-state
          icon="payments"
          title="No vendor grid data found"
          message="There are no vendor costs for the selected year yet.">
        </app-empty-state>
      }

      @if (selectedCharge(); as charge) {
        <div class="modal-backdrop" (click)="closePaymentPopup()">
          <section class="modal-card card card--spaced" role="dialog" aria-modal="true" aria-label="Mark vendor cost paid" (click)="$event.stopPropagation()">
            <div class="section-header">
              <div>
                <h2 class="section-title">Pay vendor cost</h2>
                <p class="section-copy">Upload the receipt and record the payment date in this popup before marking the cost paid.</p>
              </div>
              <button mat-stroked-button type="button" (click)="closePaymentPopup()">Close</button>
            </div>

            <div class="charge-card">
              <div class="charge-card__title">{{ charge.description }}</div>
              <div class="charge-card__meta">
                <span>{{ charge.amount | currency:'INR':'symbol':'1.2-2' }} · {{ charge.chargeType }}</span>
                <span>Effective {{ charge.effectiveDate | date:'mediumDate' }} · Due {{ charge.dueDate | date:'mediumDate' }}</span>
              </div>
            </div>

            <form [formGroup]="settlementForm" class="stack">
              <div class="two-col">
                <mat-form-field appearance="fill">
                  <mat-label>Payment date</mat-label>
                  <input matInput type="date" formControlName="paymentDate">
                </mat-form-field>

                <mat-form-field appearance="fill">
                  <mat-label>Payment method</mat-label>
                  <input matInput formControlName="paymentMethod">
                </mat-form-field>
              </div>

              <div class="two-col">
                <mat-form-field appearance="fill">
                  <mat-label>Transaction reference</mat-label>
                  <input matInput formControlName="transactionReference">
                </mat-form-field>

                <mat-form-field appearance="fill">
                  <mat-label>Notes</mat-label>
                  <input matInput formControlName="notes">
                </mat-form-field>
              </div>

              <div class="action-row">
                <input #receiptInput hidden type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" (change)="uploadReceipt($event)">
                <button mat-stroked-button type="button" (click)="receiptInput.click()" [disabled]="uploadingReceipt()">Upload receipt</button>
                @if (receiptFileName()) {
                  <span class="upload-chip">{{ receiptFileName() }}</span>
                  <button mat-stroked-button type="button" (click)="clearReceipt()">Clear receipt</button>
                }
              </div>

              <div class="action-row">
                <button mat-raised-button color="primary" type="button"
                  [disabled]="processingChargeId() === charge.id || settlementForm.invalid || !receiptUrl()"
                  (click)="markPaid()">
                  Mark paid
                </button>
              </div>
            </form>
          </section>
        </div>
      }
    </div>
  `,
  styles: [VENDOR_PAGE_STYLES + `
    .grid-shell {
      overflow-x: auto;
      overflow-y: auto;
      max-height: calc(100vh - 260px);
      scrollbar-gutter: stable;
    }
    .payment-grid { width: 100%; min-width: 1400px; border-collapse: separate; border-spacing: 0; }
    .payment-grid th, .payment-grid td { border: 1px solid var(--border); vertical-align: top; padding: 12px; background: white; text-align: left; }
    .payment-grid th { position: sticky; top: 0; background: #f8fafc; z-index: 1; }
    .row-header { min-width: 220px; background: #f8fafc; }
    .month-cell { min-width: 280px; background: #fcfcfd; }
    tfoot th { position: sticky; bottom: 0; background: #eef2f7; }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      z-index: 1000;
    }
    .modal-card {
      width: min(720px, 100%);
      max-height: calc(100vh - 48px);
      overflow-y: auto;
    }
  `],
})
export class VendorPaymentsGridComponent {
  private readonly auth = inject(AuthService);
  private readonly vendorPayments = inject(VendorPaymentService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly uploadingReceipt = signal(false);
  readonly processingChargeId = signal<string | null>(null);
  readonly grid = signal<VendorChargeGrid | null>(null);
  readonly selectedCharge = signal<VendorGridCharge | null>(null);
  readonly receiptUrl = signal<string | null>(null);
  readonly receiptFileName = signal('');

  readonly filterForm = this.fb.group({
    year: [new Date().getFullYear(), [Validators.required, Validators.min(2000)]],
  });

  readonly settlementForm = this.fb.group({
    paymentDate: [this.toDateInputValue(new Date()), Validators.required],
    paymentMethod: ['Bank Transfer', Validators.required],
    transactionReference: [''],
    notes: [''],
  });

  readonly yearOptions = computed(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
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
    this.vendorPayments.getChargeGrid(societyId, this.filterForm.controls.year.value ?? new Date().getFullYear()).subscribe({
      next: grid => {
        this.grid.set(grid);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  uploadReceipt(event: Event) {
    const societyId = this.auth.societyId();
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0) ?? null;
    if (!societyId || !file) return;

    this.uploadingReceipt.set(true);
    this.vendorPayments.uploadDocument(societyId, 'receipt', file).subscribe({
      next: response => {
        this.uploadingReceipt.set(false);
        this.receiptUrl.set(response.fileUrl);
        this.receiptFileName.set(response.fileName);
        if (input) input.value = '';
        this.snackBar.open('Receipt uploaded.', 'Dismiss', { duration: 4000 });
      },
      error: () => {
        this.uploadingReceipt.set(false);
        if (input) input.value = '';
      },
    });
  }

  clearReceipt() {
    this.receiptUrl.set(null);
    this.receiptFileName.set('');
  }

  openPaymentPopup(charge: VendorGridCharge) {
    this.selectedCharge.set(charge);
    this.clearReceipt();
    this.settlementForm.reset({
      paymentDate: this.toDateInputValue(new Date()),
      paymentMethod: 'Bank Transfer',
      transactionReference: '',
      notes: '',
    });
  }

  closePaymentPopup() {
    this.selectedCharge.set(null);
    this.clearReceipt();
  }

  markPaid() {
    const societyId = this.auth.societyId();
    const charge = this.selectedCharge();
    if (!societyId || !charge || this.settlementForm.invalid || !this.receiptUrl()) return;

    const formValue = this.settlementForm.getRawValue();
    this.processingChargeId.set(charge.id);
    this.vendorPayments.markPaid(societyId, charge.id, {
      paymentDate: formValue.paymentDate || this.toDateInputValue(new Date()),
      paymentMethod: formValue.paymentMethod?.trim() || 'Bank Transfer',
      transactionReference: formValue.transactionReference?.trim() || null,
      receiptUrl: this.receiptUrl(),
      notes: formValue.notes?.trim() || null,
    }).subscribe({
      next: () => {
        this.processingChargeId.set(null);
        this.closePaymentPopup();
        this.loadGrid();
        this.snackBar.open('Vendor charge marked paid.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.processingChargeId.set(null),
    });
  }

  inactivateCharge(charge: VendorGridCharge) {
    this.updateChargeState(
      charge.id,
      (societyId, targetChargeId) => this.vendorPayments.inactivateCharge(societyId, targetChargeId),
      'Vendor charge inactivated.',
      charge.id,
    );
  }

  activateCharge(charge: VendorGridCharge) {
    this.updateChargeState(
      charge.id,
      (societyId, targetChargeId) => this.vendorPayments.activateCharge(societyId, targetChargeId),
      'Vendor charge activated.',
      charge.id,
    );
  }

  deleteCharge(charge: VendorGridCharge) {
    if (!window.confirm(`Delete "${charge.description}"?`)) {
      return;
    }

    const societyId = this.auth.societyId();
    if (!societyId) {
      return;
    }

    this.processingChargeId.set(charge.id);
    this.vendorPayments.deleteCharge(societyId, charge.id).subscribe({
      next: () => {
        this.processingChargeId.set(null);
        if (this.selectedCharge()?.id === charge.id) {
          this.closePaymentPopup();
        }
        this.loadGrid();
        this.snackBar.open('Vendor charge deleted.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.processingChargeId.set(null),
    });
  }

  protected readonly monthLabel = monthLabel;

  private toDateInputValue(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private updateChargeState(
    chargeId: string,
    requestFactory: (societyId: string, targetChargeId: string) => Observable<unknown>,
    successMessage: string,
    selectedChargeIdToClose?: string,
  ) {
    const societyId = this.auth.societyId();
    if (!societyId) {
      return;
    }

    this.processingChargeId.set(chargeId);
    requestFactory(societyId, chargeId).subscribe({
      next: () => {
        this.processingChargeId.set(null);
        if (selectedChargeIdToClose && this.selectedCharge()?.id === selectedChargeIdToClose) {
          this.closePaymentPopup();
        }
        this.loadGrid();
        this.snackBar.open(successMessage, 'Dismiss', { duration: 4000 });
      },
      error: () => this.processingChargeId.set(null),
    });
  }
}
