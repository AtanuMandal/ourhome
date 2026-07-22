import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { MaintenanceCharge, MaintenanceChargeGrid, MaintenanceChargeStatus, MaintenanceGridCharge } from '../../core/models/maintenance.model';
import { AuthService } from '../../core/services/auth.service';
import { MaintenanceService } from '../../core/services/maintenance.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { FilePreviewComponent } from '../../shared/components/file-preview/file-preview.component';
import { ImageLightboxComponent } from '../../shared/components/image-lightbox/image-lightbox.component';
import { CHARGE_STATUS_OPTIONS, MAINTENANCE_PAGE_STYLES, MONTH_OPTIONS, periodLabel } from './maintenance-shared';

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
    SearchableSelectComponent,
    FilePreviewComponent,
    ImageLightboxComponent,
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
            <app-searchable-select label="Apartment" formControlName="apartmentId"
              [options]="penaltyApartmentOptions()"></app-searchable-select>

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
          <app-searchable-select label="Financial year" formControlName="financialYearStart"
            [options]="financialYearSelectOptions()" (selectionChange)="loadGrid()"></app-searchable-select>

          <app-searchable-select label="View" formControlName="periodView"
            [options]="periodViewOptions"></app-searchable-select>

          <app-searchable-select label="Status" formControlName="status"
            [options]="chargeStatusSelectOptions" (selectionChange)="loadGrid()"></app-searchable-select>

          <app-searchable-select label="Apartment" formControlName="apartmentId"
            [options]="filterApartmentOptions()" (selectionChange)="loadGrid()"></app-searchable-select>

          <app-searchable-select label="Block" formControlName="block"
            [options]="blockSelectOptions()" (selectionChange)="loadGrid()"></app-searchable-select>

          <app-searchable-select label="Floor" formControlName="floor"
            [options]="floorSelectOptions()" (selectionChange)="loadGrid()"></app-searchable-select>

          <mat-form-field appearance="fill">
            <mat-label>From date</mat-label>
            <input matInput type="date" formControlName="fromDate" (change)="loadGrid()">
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>To date</mat-label>
            <input matInput type="date" formControlName="toDate" (change)="loadGrid()">
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
               <p class="section-copy">Apartments are listed on the Y axis and {{ viewDescriptor() }} for FY {{ financialYearLabel(filterForm.controls.financialYearStart.value ?? currentFinancialYearStart()) }}.</p>
              <p class="section-copy">Showing {{ displayRows().length }} of {{ totalRowCount() }} apartments{{ displayRows().length < totalRowCount() ? ' — scroll down to load more' : '' }}.</p>
            </div>
          </div>

          <div class="grid-shell" (scroll)="onGridScroll($event)">
            <table class="payment-grid">
              <thead>
                @if (periodSummaries().length) {
                  <tr class="summary-row">
                    <th class="summary-row__label">Period summaries</th>
                    @for (summary of periodSummaries(); track summary.key) {
                      <th class="summary-cell">
                        <div class="summary-cell__title">{{ summary.label }}</div>
                        <div class="section-copy">Pending: {{ summary.pendingAmount | currency:'INR':'symbol':'1.2-2' }}</div>
                        <div class="section-copy">Submitted: {{ summary.submittedAmount | currency:'INR':'symbol':'1.2-2' }}</div>
                        <div class="section-copy">Paid: {{ summary.paidAmount | currency:'INR':'symbol':'1.2-2' }}</div>
                      </th>
                    }
                  </tr>
                }
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
                                @if (charge.status === 'Rejected' && charge.rejectionReason) {
                                  <div class="section-copy text-danger">Denied: {{ charge.rejectionReason }}</div>
                                }
                                @if (groupForCharge(charge); as group) {
                                  <div class="section-copy">Clubbed submission · {{ group.charges.length }} charges · {{ group.totalAmount | currency:'INR':'symbol':'1.2-2' }} total</div>
                                  <div class="action-row action-row--compact">
                                    @if (hasSupportingDocs(charge)) {
                                      <button mat-stroked-button type="button" (click)="openProofDialog(charge)">
                                        View proofs
                                      </button>
                                    }
                                    @if (group.status === 'ProofSubmitted') {
                                      <button mat-raised-button color="primary" type="button"
                                        [disabled]="processingGroupKey() === group.key || settlementForm.invalid"
                                        (click)="approveGroup(group)">
                                        Approve all {{ group.charges.length }}
                                      </button>
                                      <button mat-stroked-button color="warn" type="button"
                                        [disabled]="processingGroupKey() === group.key"
                                        (click)="openDenyDialog({ type: 'group', group })">
                                        Deny all {{ group.charges.length }}
                                      </button>
                                    }
                                  </div>
                                } @else {
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
                                      <button mat-stroked-button color="warn" type="button"
                                        [disabled]="processingChargeId() === charge.id"
                                        (click)="openDenyDialog({ type: 'single', charge })">
                                        Deny
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
                                }
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
                    <app-file-preview [src]="proof.proofUrl" alt="Payment proof" imgClass="proof-thumb"
                      [clickable]="true" (imageClick)="lightboxSrc.set(proof.proofUrl)"></app-file-preview>
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

      @if (denyTarget(); as target) {
        <div class="dialog-backdrop" (click)="closeDenyDialog()">
          <div class="dialog-card" (click)="$event.stopPropagation()">
            <div class="section-header section-header--compact">
              <div>
                <h2 class="section-title">Deny payment proof</h2>
                <p class="section-copy">
                  @if (target.type === 'single') {
                    {{ target.charge.scheduleName }} · {{ target.charge.amount | currency:'INR':'symbol':'1.2-2' }}
                  } @else {
                    {{ target.group.apartmentNumber }} · {{ target.group.charges.length }} charges · {{ target.group.totalAmount | currency:'INR':'symbol':'1.2-2' }} total
                  }
                </p>
              </div>
              <button mat-stroked-button type="button" (click)="closeDenyDialog()">Close</button>
            </div>

            <form [formGroup]="denyForm" class="stack" (ngSubmit)="confirmDeny()">
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Reason for denial</mat-label>
                <textarea matInput rows="3" formControlName="reason"
                  placeholder="Explain what's wrong with the proof so the resident can correct it"></textarea>
                @if (denyForm.controls.reason.invalid && denyForm.controls.reason.touched) {
                  <mat-error>A reason is required.</mat-error>
                }
              </mat-form-field>

              <div class="action-row">
                <button mat-raised-button color="warn" type="submit"
                  [disabled]="denyForm.invalid || processingChargeId() !== null || processingGroupKey() !== null">
                  Deny
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>

    <app-image-lightbox [open]="!!lightboxSrc()" [src]="lightboxSrc() ?? ''" (closed)="lightboxSrc.set(null)"></app-image-lightbox>
  `,
  styles: [MAINTENANCE_PAGE_STYLES + `
    .proof-thumb { width: 64px; height: 64px; border-radius: 8px; object-fit: cover; }
    .grid-shell {
      overflow-x: auto;
      overflow-y: scroll;
      max-height: calc(150vh - 260px);
      scrollbar-gutter: stable;
    }
    .payment-grid { width: 100%; min-width: 1280px; border-collapse: separate; border-spacing: 0; }
    .payment-grid th, .payment-grid td { border: 1px solid var(--border); vertical-align: top; padding: 12px; background: white; }
    .payment-grid th { position: sticky; top: 0; background: #f8fafc; z-index: 1; text-align: left; }
    .summary-row th { top: 0; z-index: 3; background: #eef6ff; }
    .summary-row + tr th { top: 107px; z-index: 2; }
    .summary-row__label { min-width: 180px; }
    .summary-cell { min-width: 240px; }
    .summary-cell__title { font-weight: 600; margin-bottom: 6px; }
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
  readonly processingGroupKey = signal<string | null>(null);
  readonly creatingPenalty = signal(false);
  readonly grid = signal<MaintenanceChargeGrid | null>(null);
  readonly proofCharge = signal<MaintenanceGridCharge | null>(null);
  readonly lightboxSrc = signal<string | null>(null);
  readonly denyTarget = signal<DenyTarget | null>(null);
  readonly chargeStatusSelectOptions = [
    { value: null as MaintenanceChargeStatus | null, label: 'All statuses' },
    ...CHARGE_STATUS_OPTIONS.map(s => ({ value: s as MaintenanceChargeStatus | null, label: s })),
  ];

  readonly filterForm = this.fb.group({
    financialYearStart: [this.currentFinancialYearStart(), [Validators.required, Validators.min(2000)]],
    periodView: ['Month' as GridPeriodView, Validators.required],
    apartmentId: [null as string | null],
    block: [null as string | null],
    floor: [null as number | null],
    status: [null as MaintenanceChargeStatus | null],
    fromDate: [''],
    toDate: [''],
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

  readonly denyForm = this.fb.group({
    reason: ['', [Validators.required, Validators.maxLength(500)]],
  });

  readonly periodViewOptions = [
    { value: 'Month' as GridPeriodView, label: 'Month' },
    { value: 'Quarter' as GridPeriodView, label: 'Quarter' },
    { value: 'Year' as GridPeriodView, label: 'Year' },
  ];

  readonly financialYearOptions = computed(() => {
    const currentYear = this.currentFinancialYearStart();
    return [currentYear - 1, currentYear, currentYear + 1];
  });

  readonly financialYearSelectOptions = computed(() =>
    this.financialYearOptions().map(y => ({ value: y, label: this.financialYearLabel(y) }))
  );

  readonly apartmentOptions = computed(() =>
    (this.grid()?.rows ?? [])
      .map(row => ({
        id: row.apartmentId,
        label: `${row.apartmentNumber}${row.residentName ? ` · ${row.residentName}` : ''}`,
      }))
      .sort((left, right) => left.label.localeCompare(right.label))
  );

  readonly penaltyApartmentOptions = computed(() =>
    this.apartmentOptions().map(a => ({ value: a.id, label: a.label }))
  );

  readonly filterApartmentOptions = computed(() => [
    { value: null as string | null, label: 'All apartments' },
    ...this.apartmentOptions().map(a => ({ value: a.id as string | null, label: a.label })),
  ]);

  readonly blockOptions = computed(() =>
    Array.from(new Set((this.grid()?.rows ?? [])
      .map(row => row.apartmentNumber.split(' ')[0])
      .filter(Boolean)))
      .sort((left, right) => left.localeCompare(right))
  );

  readonly blockSelectOptions = computed(() => [
    { value: null as string | null, label: 'All blocks' },
    ...this.blockOptions().map(b => ({ value: b as string | null, label: b })),
  ]);

  readonly floorOptions = computed(() =>
    Array.from(new Set((this.grid()?.rows ?? [])
      .map(row => {
        const match = row.apartmentNumber.match(/\s(\d+)-/);
        return match ? Number(match[1]) : null;
      })
      .filter((value): value is number => value !== null)))
      .sort((left, right) => left - right)
  );

  readonly floorSelectOptions = computed(() => [
    { value: null as number | null, label: 'All floors' },
    ...this.floorOptions().map(f => ({ value: f as number | null, label: String(f) })),
  ]);

  readonly displayPeriods = computed<GridDisplayPeriod[]>(() => {
    const months = this.grid()?.months ?? [];
    const periodView = this.filterForm.controls.periodView.value ?? 'Month';

    if (periodView === 'Quarter') {
      return [
        { key: 'Q1', label: 'Q1', months: [4, 5, 6] },
        { key: 'Q2', label: 'Q2', months: [7, 8, 9] },
        { key: 'Q3', label: 'Q3', months: [10, 11, 12] },
        { key: 'Q4', label: 'Q4', months: [1, 2, 3] },
      ].filter(period => period.months.some(month => months.includes(month)));
    }

    if (periodView === 'Year') {
      return [{ key: 'YEAR', label: 'Full year', months: months.slice() }];
    }

    return MONTH_OPTIONS
      .filter(month => months.includes(month.value))
      .map(month => ({ key: `M${month.value}`, label: month.label, months: [month.value] }));
  });

  // Rendering every apartment row's full month-by-month breakdown at once makes the page
  // unresponsive for larger societies, so only a growing window of rows is ever turned into
  // template-bound objects — the rest of the already-fetched data stays untouched until the
  // admin scrolls near the bottom of the grid (see onGridScroll).
  readonly visibleRowCount = signal(20);

  readonly totalRowCount = computed(() => this.grid()?.rows?.length ?? 0);

  readonly displayRows = computed<GridDisplayRow[]>(() =>
    (this.grid()?.rows ?? []).slice(0, this.visibleRowCount()).map(row => ({
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

  readonly periodSummaries = computed(() =>
    this.displayPeriods().map(period => {
      const charges = (this.grid()?.rows ?? [])
        .flatMap(row => row.months.filter(cell => period.months.includes(cell.month)))
        .flatMap(cell => cell.charges);

      return {
        key: period.key,
        label: period.label,
        pendingAmount: charges.filter(charge => charge.status === 'Pending').reduce((sum, charge) => sum + charge.amount, 0),
        submittedAmount: charges.filter(charge => charge.status === 'ProofSubmitted').reduce((sum, charge) => sum + charge.amount, 0),
        paidAmount: charges.filter(charge => charge.status === 'Paid').reduce((sum, charge) => sum + charge.amount, 0),
        pendingCount: charges.filter(charge => charge.status === 'Pending').length,
        submittedCount: charges.filter(charge => charge.status === 'ProofSubmitted').length,
        paidCount: charges.filter(charge => charge.status === 'Paid').length,
      };
    })
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

  /**
   * Clubbed submissions: a resident can select several charges (often across different months)
   * and submit one proof for all of them — the backend stamps every charge in that call with the
   * same submissionGroupId. A group needs 2+ members; a lone submission just renders as a normal
   * charge card in its month cell. Member charges render inside their own grid cells (there is no
   * separate review section) with group-level "Approve all / Deny all" buttons — one action
   * settles the entire clubbed submission. Denying breaks the group apart (member charges become
   * Rejected, which this predicate excludes), falling each back to the normal single-charge view;
   * approving keeps it clustered as Paid, with each charge's proofs still viewable per cell.
   */
  readonly groupedSubmissions = computed<GroupedSubmission[]>(() => {
    const rows = this.grid()?.rows ?? [];
    const byKey = new Map<string, { apartmentId: string; apartmentNumber: string; residentName?: string | null; charges: MaintenanceGridCharge[] }>();

    for (const row of rows) {
      for (const cell of row.months) {
        for (const charge of cell.charges) {
          if (charge.status !== 'ProofSubmitted' && charge.status !== 'Paid') continue;
          if (!charge.submissionGroupId) continue;

          const key = `${row.apartmentId}|${charge.submissionGroupId}`;
          const existing = byKey.get(key);
          if (existing) {
            existing.charges.push(charge);
          } else {
            byKey.set(key, {
              apartmentId: row.apartmentId,
              apartmentNumber: row.apartmentNumber,
              residentName: row.residentName,
              charges: [charge],
            });
          }
        }
      }
    }

    return Array.from(byKey.entries())
      .filter(([, value]) => value.charges.length >= 2)
      .map(([key, value]) => {
        const sorted = value.charges.slice().sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());
        return {
          key,
          apartmentId: value.apartmentId,
          apartmentNumber: value.apartmentNumber,
          residentName: value.residentName,
          status: sorted.every(charge => charge.status === 'Paid') ? 'Paid' : 'ProofSubmitted',
          charges: sorted,
          totalAmount: sorted.reduce((sum, charge) => sum + charge.amount, 0),
          periodLabel: this.formatPeriodRange(sorted),
        } satisfies GroupedSubmission;
      })
      .sort((left, right) => left.apartmentNumber.localeCompare(right.apartmentNumber, undefined, { numeric: true, sensitivity: 'base' }));
  });

  readonly groupByChargeId = computed(() => {
    const byId = new Map<string, GroupedSubmission>();
    for (const group of this.groupedSubmissions()) {
      for (const charge of group.charges) byId.set(charge.id, group);
    }
    return byId;
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

    this.maintenance.getChargeGrid(societyId, {
      financialYearStart: this.filterForm.controls.financialYearStart.value ?? this.currentFinancialYearStart(),
      apartmentId: this.filterForm.controls.apartmentId.value ?? undefined,
      block: this.filterForm.controls.block.value ?? undefined,
      floor: this.filterForm.controls.floor.value ?? undefined,
      status: this.filterForm.controls.status.value ?? undefined,
      fromDate: this.filterForm.controls.fromDate.value || undefined,
      toDate: this.filterForm.controls.toDate.value || undefined,
    }).subscribe({
      next: grid => {
        this.grid.set(grid);
        this.visibleRowCount.set(20);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  /** Reveals another page of rows once the admin scrolls near the bottom of the grid. */
  onGridScroll(event: Event): void {
    const target = event.target as HTMLElement;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceFromBottom > 300) return;
    if (this.visibleRowCount() >= this.totalRowCount()) return;

    this.visibleRowCount.update(count => Math.min(count + 20, this.totalRowCount()));
  }

  approveProof(charge: MaintenanceGridCharge) {
    this.processCharge(charge.id, () => this.maintenance.approveProof(this.auth.societyId()!, charge.id, this.settlementPayload()), 'Maintenance proof approved.');
  }

  markPaid(charge: MaintenanceGridCharge) {
    this.processCharge(charge.id, () => this.maintenance.markPaid(this.auth.societyId()!, charge.id, this.settlementPayload()), 'Maintenance charge marked as paid.');
  }

  /** The clubbed submission this charge belongs to (2+ members), or null for a normal charge. */
  groupForCharge(charge: MaintenanceGridCharge): GroupedSubmission | null {
    return this.groupByChargeId().get(charge.id) ?? null;
  }

  isGroupedCharge(charge: MaintenanceGridCharge): boolean {
    return this.groupByChargeId().has(charge.id);
  }

  /** Approves every charge in a clubbed submission with one action and one settlement. */
  approveGroup(group: GroupedSubmission) {
    if (this.settlementForm.invalid) return;
    const societyId = this.auth.societyId();
    if (!societyId) return;

    const settlement = this.settlementPayload();
    this.processingGroupKey.set(group.key);
    this.maintenance.approveProofGroup(societyId, { chargeIds: group.charges.map(charge => charge.id), ...settlement }).subscribe({
      next: updatedCharges => {
        this.processingGroupKey.set(null);
        for (const updated of updatedCharges) {
          this.patchChargeInGrid(updated.id, {
            status: 'Paid',
            isOverdue: false,
            paidAt: updated.paidAt ?? new Date().toISOString(),
            paymentMethod: settlement.paymentMethod,
            transactionReference: settlement.transactionReference,
            receiptUrl: settlement.receiptUrl,
            notes: settlement.notes,
            rejectionReason: null,
            rejectedAt: null,
          });
        }
        this.snackBar.open('Clubbed submission approved.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.processingGroupKey.set(null),
    });
  }

  openDenyDialog(target: DenyTarget) {
    this.denyForm.reset({ reason: '' });
    this.denyTarget.set(target);
  }

  closeDenyDialog() {
    this.denyTarget.set(null);
    this.denyForm.reset({ reason: '' });
  }

  /** Denies a single charge or an entire clubbed submission with one comment. Denying always
   *  falls back the affected charge(s) to Rejected, which drops them out of any grouped view. */
  confirmDeny() {
    const target = this.denyTarget();
    const societyId = this.auth.societyId();
    if (!target || !societyId || this.denyForm.invalid) return;

    const reason = this.denyForm.controls.reason.value?.trim() || '';

    if (target.type === 'single') {
      this.processingChargeId.set(target.charge.id);
      this.maintenance.denyProof(societyId, target.charge.id, { reason }).subscribe({
        next: updated => {
          this.processingChargeId.set(null);
          this.patchChargeInGrid(target.charge.id, {
            status: 'Rejected',
            rejectionReason: updated.rejectionReason ?? reason,
            rejectedAt: updated.rejectedAt ?? new Date().toISOString(),
          });
          this.closeDenyDialog();
          this.snackBar.open('Maintenance proof denied.', 'Dismiss', { duration: 4000 });
        },
        error: () => this.processingChargeId.set(null),
      });
      return;
    }

    const chargeIds = target.group.charges.map(charge => charge.id);
    this.processingGroupKey.set(target.group.key);
    this.maintenance.denyProofGroup(societyId, { chargeIds, reason }).subscribe({
      next: updatedCharges => {
        this.processingGroupKey.set(null);
        for (const updated of updatedCharges) {
          this.patchChargeInGrid(updated.id, {
            status: 'Rejected',
            rejectionReason: updated.rejectionReason ?? reason,
            rejectedAt: updated.rejectedAt ?? new Date().toISOString(),
          });
        }
        this.closeDenyDialog();
        this.snackBar.open('Clubbed submission denied.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.processingGroupKey.set(null),
    });
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
      next: charge => {
        this.creatingPenalty.set(false);
        this.penaltyForm.patchValue({
          amount: null,
          reason: '',
          dueDate: this.toDateInputValue(new Date()),
        });
        this.addChargeToGrid(charge);
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
        this.applySettlementToCharge(chargeId);
        this.snackBar.open(successMessage, 'Dismiss', { duration: 4000 });
      },
      error: () => this.processingChargeId.set(null),
    });
  }

  /**
   * Approving a proof or marking a charge paid always transitions it to Paid with exactly the
   * settlement details just submitted, so the outcome can be applied locally without waiting on
   * a full grid refetch — the approve/mark-paid endpoints only return a success flag, not the
   * updated charge.
   */
  private applySettlementToCharge(chargeId: string): void {
    const settlement = this.settlementPayload();
    this.patchChargeInGrid(chargeId, {
      status: 'Paid',
      isOverdue: false,
      paidAt: new Date().toISOString(),
      paymentMethod: settlement.paymentMethod,
      transactionReference: settlement.transactionReference,
      receiptUrl: settlement.receiptUrl,
      notes: settlement.notes,
      rejectionReason: null,
      rejectedAt: null,
    });
  }

  /** "April 2026" for a single-period group, "April 2026 – June 2026" when it spans several. */
  private formatPeriodRange(charges: MaintenanceGridCharge[]): string {
    if (charges.length === 0) return '';

    const dates = charges.map(charge => new Date(charge.dueDate));
    const min = dates.reduce((earliest, current) => (current < earliest ? current : earliest));
    const max = dates.reduce((latest, current) => (current > latest ? current : latest));
    const minLabel = periodLabel(min.getUTCFullYear(), min.getUTCMonth() + 1);
    const maxLabel = periodLabel(max.getUTCFullYear(), max.getUTCMonth() + 1);
    return minLabel === maxLabel ? minLabel : `${minLabel} – ${maxLabel}`;
  }

  /** Immutably updates one charge wherever it appears in the loaded grid, without refetching. */
  private patchChargeInGrid(chargeId: string, patch: Partial<MaintenanceGridCharge>): void {
    const current = this.grid();
    if (!current) return;

    this.grid.set({
      ...current,
      rows: current.rows.map(row => {
        if (!row.months.some(cell => cell.charges.some(charge => charge.id === chargeId))) return row;
        return {
          ...row,
          months: row.months.map(cell => {
            if (!cell.charges.some(charge => charge.id === chargeId)) return cell;
            const charges = cell.charges.map(charge => (charge.id === chargeId ? { ...charge, ...patch } : charge));
            return {
              ...cell,
              charges,
              totalAmount: charges.reduce((sum, charge) => sum + charge.amount, 0),
              hasOverdue: charges.some(charge => charge.isOverdue),
            };
          }),
        };
      }),
    });

    // The dialog may be showing the charge that was just settled — keep it in sync too.
    if (this.proofCharge()?.id === chargeId) {
      this.proofCharge.update(charge => (charge ? { ...charge, ...patch } : charge));
    }
  }

  /**
   * Splices a freshly created penalty charge into the loaded grid, respecting whichever
   * status/date filters are currently active so a charge that wouldn't otherwise be visible
   * doesn't suddenly appear until the admin reloads.
   */
  private addChargeToGrid(charge: MaintenanceCharge): void {
    const current = this.grid();
    if (!current || !current.months.includes(charge.chargeMonth)) return;

    const statusFilter = this.filterForm.controls.status.value;
    if (statusFilter && charge.status !== statusFilter) return;

    const chargeDueDate = charge.dueDate.slice(0, 10);
    const fromDate = this.filterForm.controls.fromDate.value;
    if (fromDate && chargeDueDate < fromDate) return;
    const toDate = this.filterForm.controls.toDate.value;
    if (toDate && chargeDueDate > toDate) return;

    const gridCharge: MaintenanceGridCharge = {
      id: charge.id,
      scheduleId: charge.scheduleId,
      scheduleName: charge.scheduleName,
      amount: charge.amount,
      status: charge.status,
      dueDate: charge.dueDate,
      isOverdue: charge.isOverdue,
      paidAt: charge.paidAt,
      paymentMethod: charge.paymentMethod,
      transactionReference: charge.transactionReference,
      receiptUrl: charge.receiptUrl,
      notes: charge.notes,
      proofs: charge.proofs,
    };

    let apartmentRowExists = false;
    const rows = current.rows.map(row => {
      if (row.apartmentId !== charge.apartmentId) return row;
      apartmentRowExists = true;
      return {
        ...row,
        months: row.months.map(cell => {
          if (cell.month !== charge.chargeMonth) return cell;
          const charges = [...cell.charges, gridCharge];
          return {
            ...cell,
            charges,
            totalAmount: charges.reduce((sum, c) => sum + c.amount, 0),
            hasOverdue: charges.some(c => c.isOverdue),
          };
        }),
      };
    });

    // The apartment isn't part of the currently filtered view — nothing to splice in.
    if (!apartmentRowExists) return;
    this.grid.set({ ...current, rows });
  }

  private toDateInputValue(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  currentFinancialYearStart() {
    const now = new Date();
    return now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  }

  financialYearLabel(year: number) {
    return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
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

interface GroupedSubmission {
  key: string;
  apartmentId: string;
  apartmentNumber: string;
  residentName?: string | null;
  status: 'ProofSubmitted' | 'Paid';
  charges: MaintenanceGridCharge[];
  totalAmount: number;
  periodLabel: string;
}

type DenyTarget =
  | { type: 'single'; charge: MaintenanceGridCharge }
  | { type: 'group'; group: GroupedSubmission };
