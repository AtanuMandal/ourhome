import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { AuthService } from '../../core/services/auth.service';
import { VendorPaymentService } from '../../core/services/vendor-payment.service';
import {
  VendorCharge,
  VendorPaymentVendor,
  VendorRecurringSchedule,
} from '../../core/models/vendor-payment.model';
import {
  MONTH_OPTIONS,
  VENDOR_CHARGE_STATUS_OPTIONS,
  VENDOR_FREQUENCY_OPTIONS,
  VENDOR_PAGE_STYLES,
  annualEquivalent,
  monthInputToIsoDate,
  monthYearLabel,
  monthlyEquivalent,
  periodLabel,
  sortVendorCharges,
  toMonthInputValue,
} from './vendor-payments-shared';

@Component({
  selector: 'app-vendor-payments-admin',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
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
      title="Vendor payments"
      subtitle="Manage vendors, recurring schedules, one-time costs, and payment tracking">
    </app-page-header>

    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else {
        <section class="card card--spaced">
          <div class="section-header">
            <div>
              <h2 class="section-title">Vendor registry</h2>
              <p class="section-copy">Search vendors, upload picture and contract files, and maintain vendor validity and due-day rules.</p>
            </div>
            <div class="section-header__actions">
              <button mat-stroked-button color="primary" routerLink="/vendor-payments/grid" type="button">Open payment grid</button>
              <button mat-stroked-button type="button" (click)="resetVendorForm()">New vendor</button>
            </div>
          </div>

          <div class="filters">
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Search vendors</mat-label>
              <input matInput [(ngModel)]="vendorSearch" (ngModelChange)="loadVendors()" placeholder="Name, business type, contact...">
            </mat-form-field>
          </div>

          @if (vendors().length) {
            <div class="vendor-grid">
              @for (vendor of vendors(); track vendor.id) {
                <button type="button" class="vendor-card" [class.vendor-card--active]="selectedVendorId() === vendor.id" (click)="selectVendor(vendor)">
                  <div class="vendor-card__title">{{ vendor.name }}</div>
                  <div class="vendor-card__meta">
                    <span>{{ vendor.businessType || 'Business type not set' }}</span>
                    <span>{{ vendor.pointOfContact.firstName }} {{ vendor.pointOfContact.lastName }} · {{ vendor.pointOfContact.phoneNumber }}</span>
                    <span>Valid upto {{ vendor.validUptoDate | date:'mediumDate' }}</span>
                  </div>
                  <div class="action-row action-row--compact">
                    <app-status-chip [status]="vendor.isActive ? 'Active' : 'Inactive'"></app-status-chip>
                  </div>
                </button>
              }
            </div>
          } @else {
            <div class="empty-copy">No vendors found for the current search.</div>
          }

          <mat-divider></mat-divider>

          <form [formGroup]="vendorForm" class="stack" (ngSubmit)="saveVendor()">
            <div class="two-col">
              <mat-form-field appearance="fill">
                <mat-label>Vendor name</mat-label>
                <input matInput formControlName="name">
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>Business type</mat-label>
                <input matInput formControlName="businessType">
              </mat-form-field>
            </div>

            <div class="three-col">
              <mat-form-field appearance="fill">
                <mat-label>Street</mat-label>
                <input matInput formControlName="street">
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>City</mat-label>
                <input matInput formControlName="city">
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>State</mat-label>
                <input matInput formControlName="state">
              </mat-form-field>
            </div>

            <div class="three-col">
              <mat-form-field appearance="fill">
                <mat-label>Postal code</mat-label>
                <input matInput formControlName="postalCode">
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>Country</mat-label>
                <input matInput formControlName="country">
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>Geographic service area</mat-label>
                <input matInput formControlName="geographicServiceArea">
              </mat-form-field>
            </div>

            <div class="three-col">
              <mat-form-field appearance="fill">
                <mat-label>Contact first name</mat-label>
                <input matInput formControlName="contactFirstName">
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>Contact last name</mat-label>
                <input matInput formControlName="contactLastName">
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>Contact phone</mat-label>
                <input matInput formControlName="contactPhone">
              </mat-form-field>
            </div>

            <div class="two-col">
              <mat-form-field appearance="fill">
                <mat-label>Contact email</mat-label>
                <input matInput formControlName="contactEmail">
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>Payment due days</mat-label>
                <input matInput type="number" min="0" max="180" formControlName="paymentDueDays">
              </mat-form-field>
            </div>

            <div class="two-col">
              <mat-form-field appearance="fill">
                <mat-label>Valid upto</mat-label>
                <input matInput type="date" formControlName="validUptoDate">
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>Status</mat-label>
                <select matNativeControl formControlName="isActive">
                  <option [ngValue]="true">Active</option>
                  <option [ngValue]="false">Inactive</option>
                </select>
              </mat-form-field>
            </div>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Overview</mat-label>
              <textarea matInput rows="3" formControlName="overview"></textarea>
            </mat-form-field>

            <div class="action-row">
              <input #pictureInput hidden type="file" accept="image/*" (change)="uploadVendorDocument('picture', $event)">
              <input #contractInput hidden type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" (change)="uploadVendorDocument('contract', $event)">
              <button mat-stroked-button type="button" (click)="pictureInput.click()" [disabled]="uploadingDocument()">Upload picture</button>
              <button mat-stroked-button type="button" (click)="contractInput.click()" [disabled]="uploadingDocument()">Upload contract</button>
              @if (vendorForm.controls.pictureUrl.value) {
                <span class="upload-chip">Picture ready</span>
              }
              @if (vendorForm.controls.contractUrl.value) {
                <span class="upload-chip">Contract ready</span>
              }
            </div>

            <div class="action-row">
              <button mat-raised-button color="primary" type="submit" [disabled]="vendorForm.invalid || savingVendor()">
                {{ selectedVendorId() ? 'Update vendor' : 'Create vendor' }}
              </button>
            </div>
          </form>
        </section>

        <section class="card card--spaced">
          <div class="section-header">
            <div>
              <h2 class="section-title">Cost setup</h2>
              <p class="section-copy">Add recurring schedules or one-time costs for the selected vendor.</p>
            </div>
          </div>

          @if (selectedVendor(); as vendor) {
            <div class="totals-strip">
              <div class="total-card">
                <div class="total-card__label">Selected vendor</div>
                <div class="total-card__value">{{ vendor.name }}</div>
              </div>
              <div class="total-card">
                <div class="total-card__label">Due days</div>
                <div class="total-card__value">{{ vendor.paymentDueDays }}</div>
              </div>
              <div class="total-card">
                <div class="total-card__label">Valid upto</div>
                <div class="total-card__value">{{ vendor.validUptoDate | date:'mediumDate' }}</div>
              </div>
            </div>

            <div class="three-col">
              <form [formGroup]="scheduleForm" class="card schedule-card" (ngSubmit)="saveSchedule()">
                <div class="schedule-card__title">Recurring cost schedule</div>
                <mat-form-field appearance="fill">
                  <mat-label>Frequency</mat-label>
                  <select matNativeControl formControlName="frequency">
                    @for (frequency of frequencyOptions; track frequency) {
                      <option [ngValue]="frequency">{{ frequency }}</option>
                    }
                  </select>
                </mat-form-field>
                <mat-form-field appearance="fill">
                  <mat-label>Amount</mat-label>
                  <input matInput type="number" min="0.01" step="0.01" formControlName="amount">
                </mat-form-field>
                <mat-form-field appearance="fill">
                  <mat-label>Start month</mat-label>
                  <input matInput type="month" formControlName="startDate">
                </mat-form-field>
                <mat-form-field appearance="fill">
                  <mat-label>End month</mat-label>
                  <input matInput type="month" formControlName="endDate">
                </mat-form-field>
                <mat-form-field appearance="fill">
                  <mat-label>Label</mat-label>
                  <input matInput formControlName="label" placeholder="Optional">
                </mat-form-field>
                <div class="schedule-card__meta">
                  <span>Monthly equivalent: {{ scheduleMonthlyEquivalent() | currency:'INR':'symbol':'1.2-2' }}</span>
                  <span>Annual equivalent: {{ scheduleAnnualEquivalent() | currency:'INR':'symbol':'1.2-2' }}</span>
                </div>
                <div class="action-row">
                  <button mat-raised-button color="primary" type="submit" [disabled]="scheduleForm.invalid || savingSchedule()">Create schedule</button>
                </div>
              </form>

              <form [formGroup]="scheduleWindowForm" class="card schedule-card" (ngSubmit)="saveScheduleWindow()">
                <div class="schedule-card__title">Schedule window update</div>
                @if (selectedSchedule(); as schedule) {
                  <div class="schedule-card__meta">
                    <span>{{ schedule.label || schedule.frequency }} · {{ schedule.amount | currency:'INR':'symbol':'1.2-2' }}</span>
                    <span>Start {{ monthYearLabel(schedule.startDate) }}</span>
                  </div>
                } @else {
                  <div class="empty-copy">Select a schedule below to update its end month and/or the month from which future charges should turn inactive.</div>
                }
                <mat-form-field appearance="fill">
                  <mat-label>End month</mat-label>
                  <input matInput type="month" formControlName="endDate">
                </mat-form-field>
                <mat-form-field appearance="fill">
                  <mat-label>Inactive from month</mat-label>
                  <input matInput type="month" formControlName="inactiveFromDate">
                </mat-form-field>
                <div class="action-row">
                  <button mat-raised-button color="primary" type="submit" [disabled]="!selectedScheduleId() || savingScheduleWindow()">Update schedule</button>
                </div>
              </form>

              <form [formGroup]="oneTimeChargeForm" class="card charge-card" (ngSubmit)="createOneTimeCharge()">
                <div class="charge-card__title">One-time cost</div>
                <mat-form-field appearance="fill">
                  <mat-label>Amount</mat-label>
                  <input matInput type="number" min="0.01" step="0.01" formControlName="amount">
                </mat-form-field>
                <mat-form-field appearance="fill">
                  <mat-label>Effective month</mat-label>
                  <input matInput type="month" formControlName="effectiveDate">
                </mat-form-field>
                <mat-form-field appearance="fill">
                  <mat-label>Description</mat-label>
                  <input matInput formControlName="description">
                </mat-form-field>
                <div class="action-row">
                  <button mat-raised-button color="primary" type="submit" [disabled]="oneTimeChargeForm.invalid || savingCharge()">Create one-time cost</button>
                </div>
              </form>
            </div>
          } @else {
            <div class="empty-copy">Select a vendor first to add schedules and one-time costs.</div>
          }
        </section>

        <section class="card card--spaced">
          <div class="section-header">
            <div>
              <h2 class="section-title">Selected vendor schedules</h2>
              <p class="section-copy">Schedules stay immutable except for end-month changes.</p>
            </div>
          </div>

          @if (schedules().length) {
            <div class="vendor-grid">
              @for (schedule of schedules(); track schedule.id) {
                <button type="button" class="schedule-card" [class.schedule-card--active]="selectedScheduleId() === schedule.id" (click)="selectSchedule(schedule)">
                  <div class="schedule-card__title">{{ schedule.label || schedule.frequency }}</div>
                  <div class="schedule-card__meta">
                    <span>{{ schedule.amount | currency:'INR':'symbol':'1.2-2' }} · {{ schedule.frequency }}</span>
                    <span>{{ monthYearLabel(schedule.startDate) }} to {{ schedule.endDate ? monthYearLabel(schedule.endDate) : 'Open-ended' }}</span>
                  </div>
                  <div class="action-row action-row--compact">
                    <app-status-chip [status]="schedule.isActive ? 'Active' : 'Inactive'"></app-status-chip>
                  </div>
                </button>
              }
            </div>
          } @else {
            <div class="empty-copy">No recurring schedules have been added for the selected vendor yet.</div>
          }
        </section>

        <section class="card card--spaced">
          <div class="section-header">
            <div>
              <h2 class="section-title">Charge register</h2>
              <p class="section-copy">Review all generated and one-time vendor costs for the selected vendor.</p>
            </div>
          </div>

          <form [formGroup]="chargeFilterForm" class="filters">
            <mat-form-field appearance="fill">
              <mat-label>Year</mat-label>
              <select matNativeControl formControlName="year" (change)="loadCharges()">
                <option [ngValue]="null">All years</option>
                @for (year of yearOptions(); track year) {
                  <option [ngValue]="year">{{ year }}</option>
                }
              </select>
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Month</mat-label>
              <select matNativeControl formControlName="month" (change)="loadCharges()">
                <option [ngValue]="null">All months</option>
                @for (month of monthOptions; track month.value) {
                  <option [ngValue]="month.value">{{ month.label }}</option>
                }
              </select>
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Status</mat-label>
              <select matNativeControl formControlName="status" (change)="loadCharges()">
                <option [ngValue]="null">All statuses</option>
                @for (status of chargeStatusOptions; track status) {
                  <option [ngValue]="status">{{ status }}</option>
                }
              </select>
            </mat-form-field>
          </form>

          @if (charges().length) {
            <div class="vendor-grid">
              @for (charge of charges(); track charge.id) {
                <div class="charge-card" [class.charge-card--overdue]="charge.isOverdue">
                  <div class="charge-card__title">{{ charge.description }}</div>
                  <div class="charge-card__meta">
                    <span>{{ periodLabel(charge.chargeYear, charge.chargeMonth) }} · {{ charge.amount | currency:'INR':'symbol':'1.2-2' }}</span>
                    <span>Effective {{ charge.effectiveDate | date:'mediumDate' }} · Due {{ charge.dueDate | date:'mediumDate' }}</span>
                    @if (charge.transactionReference) {
                      <span>Reference: {{ charge.transactionReference }}</span>
                    }
                  </div>
                  <div class="action-row">
                    <app-status-chip [status]="charge.status"></app-status-chip>
                    <app-status-chip [status]="charge.isActive ? 'Active' : 'Inactive'"></app-status-chip>
                    @if (charge.receiptUrl) {
                      <a class="inline-link" [href]="charge.receiptUrl" target="_blank" rel="noreferrer">Receipt</a>
                    }
                    @if (charge.isOverdue) {
                      <span class="text-danger">Overdue</span>
                    }
                  </div>
                  <div class="action-row action-row--compact">
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
            <div class="empty-copy">No charges match the current filters.</div>
          }
        </section>
      }
    </div>
  `,
  styles: [VENDOR_PAGE_STYLES],
})
export class VendorPaymentsAdminComponent {
  private readonly auth = inject(AuthService);
  private readonly vendorPayments = inject(VendorPaymentService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly savingVendor = signal(false);
  readonly uploadingDocument = signal(false);
  readonly savingSchedule = signal(false);
  readonly savingScheduleWindow = signal(false);
  readonly savingCharge = signal(false);
  readonly processingChargeId = signal<string | null>(null);
  readonly vendors = signal<VendorPaymentVendor[]>([]);
  readonly schedules = signal<VendorRecurringSchedule[]>([]);
  readonly charges = signal<VendorCharge[]>([]);
  readonly selectedVendorId = signal<string | null>(null);
  readonly selectedScheduleId = signal<string | null>(null);

  readonly frequencyOptions = VENDOR_FREQUENCY_OPTIONS;
  readonly chargeStatusOptions = VENDOR_CHARGE_STATUS_OPTIONS;
  readonly monthOptions = MONTH_OPTIONS;
  vendorSearch = '';

  readonly vendorForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    street: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', Validators.required],
    postalCode: ['', Validators.required],
    country: ['India', Validators.required],
    pictureUrl: [''],
    contactFirstName: ['', Validators.required],
    contactLastName: ['', Validators.required],
    contactPhone: ['', Validators.required],
    contactEmail: ['', [Validators.required, Validators.email]],
    overview: ['', [Validators.required, Validators.maxLength(2000)]],
    validUptoDate: [this.toDateInputValue(new Date(Date.now() + 1000 * 60 * 60 * 24 * 180)), Validators.required],
    paymentDueDays: [15, [Validators.required, Validators.min(0), Validators.max(180)]],
    geographicServiceArea: [''],
    businessType: [''],
    contractUrl: [''],
    isActive: [true, Validators.required],
  });

  readonly scheduleForm = this.fb.group({
    frequency: ['Monthly', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    startDate: [this.toMonthInputValue(new Date()), Validators.required],
    endDate: [''],
    label: [''],
  });

  readonly scheduleWindowForm = this.fb.group({
    endDate: [''],
    inactiveFromDate: [''],
  });

  readonly oneTimeChargeForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    effectiveDate: [this.toMonthInputValue(new Date()), Validators.required],
    description: [''],
  });

  readonly chargeFilterForm = this.fb.group({
    year: [new Date().getFullYear() as number | null],
    month: [null as number | null],
    status: [null as string | null],
  });

  readonly selectedVendor = computed(() => this.vendors().find(vendor => vendor.id === this.selectedVendorId()) ?? null);
  readonly selectedSchedule = computed(() => this.schedules().find(schedule => schedule.id === this.selectedScheduleId()) ?? null);
  readonly yearOptions = computed(() => {
    const years = new Set<number>([
      new Date().getFullYear() - 1,
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      ...this.charges().map(charge => charge.chargeYear),
    ]);
    return Array.from(years).sort((left, right) => right - left);
  });

  constructor() {
    this.loadVendors();
  }

  scheduleMonthlyEquivalent() {
    const amount = Number(this.scheduleForm.controls.amount.value ?? 0);
    const frequency = this.scheduleForm.controls.frequency.value as any;
    return monthlyEquivalent(amount, frequency);
  }

  scheduleAnnualEquivalent() {
    const amount = Number(this.scheduleForm.controls.amount.value ?? 0);
    const frequency = this.scheduleForm.controls.frequency.value as any;
    return annualEquivalent(amount, frequency);
  }

  selectVendor(vendor: VendorPaymentVendor) {
    this.selectedVendorId.set(vendor.id);
    this.selectedScheduleId.set(null);
    this.vendorForm.patchValue({
      name: vendor.name,
      street: vendor.address.street,
      city: vendor.address.city,
      state: vendor.address.state,
      postalCode: vendor.address.postalCode,
      country: vendor.address.country,
      pictureUrl: vendor.pictureUrl ?? '',
      contactFirstName: vendor.pointOfContact.firstName,
      contactLastName: vendor.pointOfContact.lastName,
      contactPhone: vendor.pointOfContact.phoneNumber,
      contactEmail: vendor.pointOfContact.email,
      overview: vendor.overview,
      validUptoDate: this.toDateInputValue(new Date(vendor.validUptoDate)),
      paymentDueDays: vendor.paymentDueDays,
      geographicServiceArea: vendor.geographicServiceArea ?? '',
      businessType: vendor.businessType ?? '',
      contractUrl: vendor.contractUrl ?? '',
      isActive: vendor.isActive,
    });
    this.loadSchedules();
    this.loadCharges();
  }

  resetVendorForm() {
    this.selectedVendorId.set(null);
    this.selectedScheduleId.set(null);
    this.vendorForm.reset({
      name: '',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      pictureUrl: '',
      contactFirstName: '',
      contactLastName: '',
      contactPhone: '',
      contactEmail: '',
      overview: '',
      validUptoDate: this.toDateInputValue(new Date(Date.now() + 1000 * 60 * 60 * 24 * 180)),
      paymentDueDays: 15,
      geographicServiceArea: '',
      businessType: '',
      contractUrl: '',
      isActive: true,
    });
    this.schedules.set([]);
    this.charges.set([]);
  }

  saveVendor() {
    const societyId = this.auth.societyId();
    if (!societyId || this.vendorForm.invalid) return;

    const formValue = this.vendorForm.getRawValue();
    const payload = {
      name: formValue.name?.trim() || '',
      street: formValue.street?.trim() || '',
      city: formValue.city?.trim() || '',
      state: formValue.state?.trim() || '',
      postalCode: formValue.postalCode?.trim() || '',
      country: formValue.country?.trim() || '',
      pictureUrl: formValue.pictureUrl?.trim() || null,
      contactFirstName: formValue.contactFirstName?.trim() || '',
      contactLastName: formValue.contactLastName?.trim() || '',
      contactPhone: formValue.contactPhone?.trim() || '',
      contactEmail: formValue.contactEmail?.trim() || '',
      overview: formValue.overview?.trim() || '',
      validUptoDate: formValue.validUptoDate || '',
      paymentDueDays: Number(formValue.paymentDueDays ?? 0),
      geographicServiceArea: formValue.geographicServiceArea?.trim() || null,
      businessType: formValue.businessType?.trim() || null,
      contractUrl: formValue.contractUrl?.trim() || null,
      isActive: !!formValue.isActive,
    };

    this.savingVendor.set(true);
    const request = this.selectedVendorId()
      ? this.vendorPayments.updateVendor(societyId, this.selectedVendorId()!, payload)
      : this.vendorPayments.createVendor(societyId, payload);

    request.subscribe({
      next: vendor => {
        this.savingVendor.set(false);
        this.loadVendors(vendor.id);
        this.snackBar.open(this.selectedVendorId() ? 'Vendor updated.' : 'Vendor created.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.savingVendor.set(false),
    });
  }

  uploadVendorDocument(kind: 'picture' | 'contract', event: Event) {
    const societyId = this.auth.societyId();
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0) ?? null;
    if (!societyId || !file) return;

    this.uploadingDocument.set(true);
    this.vendorPayments.uploadDocument(societyId, kind, file).subscribe({
      next: response => {
        this.uploadingDocument.set(false);
        this.vendorForm.patchValue({
          pictureUrl: kind === 'picture' ? response.fileUrl : this.vendorForm.controls.pictureUrl.value,
          contractUrl: kind === 'contract' ? response.fileUrl : this.vendorForm.controls.contractUrl.value,
        });
        if (input) input.value = '';
        this.snackBar.open(`${kind === 'picture' ? 'Picture' : 'Contract'} uploaded.`, 'Dismiss', { duration: 4000 });
      },
      error: () => {
        this.uploadingDocument.set(false);
        if (input) input.value = '';
      },
    });
  }

  saveSchedule() {
    const societyId = this.auth.societyId();
    const vendorId = this.selectedVendorId();
    if (!societyId || !vendorId || this.scheduleForm.invalid) return;

    const formValue = this.scheduleForm.getRawValue();
    this.savingSchedule.set(true);
    this.vendorPayments.createSchedule(societyId, {
      vendorId,
      frequency: formValue.frequency as any,
      amount: Number(formValue.amount ?? 0),
      startDate: this.monthInputToIsoDate(formValue.startDate || ''),
      endDate: formValue.endDate?.trim() ? this.monthInputToIsoDate(formValue.endDate.trim()) : null,
      label: formValue.label?.trim() || null,
    }).subscribe({
      next: () => {
        this.savingSchedule.set(false);
        this.scheduleForm.patchValue({
          amount: null,
          startDate: this.toMonthInputValue(new Date()),
          endDate: '',
          label: '',
        });
        this.loadSchedules();
        this.loadCharges();
        this.snackBar.open('Recurring schedule created.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.savingSchedule.set(false),
    });
  }

  selectSchedule(schedule: VendorRecurringSchedule) {
    this.selectedScheduleId.set(schedule.id);
    this.scheduleWindowForm.patchValue({
      endDate: schedule.endDate ? this.toMonthInputValue(new Date(schedule.endDate)) : '',
      inactiveFromDate: schedule.inactiveFromDate ? this.toMonthInputValue(new Date(schedule.inactiveFromDate)) : '',
    });
  }

  saveScheduleWindow() {
    const societyId = this.auth.societyId();
    const scheduleId = this.selectedScheduleId();
    if (!societyId || !scheduleId) return;

    const formValue = this.scheduleWindowForm.getRawValue();
    this.savingScheduleWindow.set(true);
    this.vendorPayments.updateSchedule(societyId, scheduleId, {
      endDate: formValue.endDate?.trim() ? this.monthInputToIsoDate(formValue.endDate.trim()) : null,
      inactiveFromDate: formValue.inactiveFromDate?.trim() ? this.monthInputToIsoDate(formValue.inactiveFromDate.trim()) : null,
    }).subscribe({
      next: updated => {
        this.savingScheduleWindow.set(false);
        this.loadSchedules(updated.id);
        this.loadCharges();
        this.snackBar.open('Schedule window updated.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.savingScheduleWindow.set(false),
    });
  }

  createOneTimeCharge() {
    const societyId = this.auth.societyId();
    const vendorId = this.selectedVendorId();
    if (!societyId || !vendorId || this.oneTimeChargeForm.invalid) return;

    const formValue = this.oneTimeChargeForm.getRawValue();
    this.savingCharge.set(true);
    this.vendorPayments.createOneTimeCharge(societyId, {
      vendorId,
      amount: Number(formValue.amount ?? 0),
      effectiveDate: this.monthInputToIsoDate(formValue.effectiveDate || ''),
      description: formValue.description?.trim() || null,
    }).subscribe({
      next: () => {
        this.savingCharge.set(false);
        this.oneTimeChargeForm.patchValue({
          amount: null,
          effectiveDate: this.toMonthInputValue(new Date()),
          description: '',
        });
        this.loadCharges();
        this.snackBar.open('One-time cost created.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.savingCharge.set(false),
    });
  }

  loadVendors(selectVendorId?: string) {
    const societyId = this.auth.societyId();
    if (!societyId) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.vendorPayments.listVendors(societyId, this.vendorSearch.trim() || undefined).subscribe({
      next: vendors => {
        this.vendors.set(vendors ?? []);
        this.loading.set(false);
        const targetVendorId = selectVendorId ?? this.selectedVendorId();
        if (targetVendorId) {
          const vendor = vendors.find(item => item.id === targetVendorId);
          if (vendor) {
            this.selectVendor(vendor);
          } else {
            this.resetVendorForm();
          }
        }
      },
      error: () => this.loading.set(false),
    });
  }

  loadSchedules(selectScheduleId?: string) {
    const societyId = this.auth.societyId();
    const vendorId = this.selectedVendorId();
    if (!societyId || !vendorId) {
      this.schedules.set([]);
      return;
    }

    this.vendorPayments.listSchedules(societyId, vendorId).subscribe({
      next: schedules => {
        const sorted = (schedules ?? []).slice().sort((left, right) => left.startDate.localeCompare(right.startDate));
        this.schedules.set(sorted);
        const targetSchedule = sorted.find(schedule => schedule.id === (selectScheduleId ?? this.selectedScheduleId()));
        if (targetSchedule) {
          this.selectSchedule(targetSchedule);
        }
      },
    });
  }

  loadCharges() {
    const societyId = this.auth.societyId();
    const vendorId = this.selectedVendorId();
    if (!societyId || !vendorId) {
      this.charges.set([]);
      return;
    }

    this.vendorPayments.listCharges(societyId, {
      vendorId,
      year: this.chargeFilterForm.controls.year.value ?? undefined,
      month: this.chargeFilterForm.controls.month.value ?? undefined,
      status: this.chargeFilterForm.controls.status.value as any,
      page: 1,
      pageSize: 200,
    }).subscribe({
      next: result => this.charges.set(sortVendorCharges(result.items ?? [])),
    });
  }

  inactivateCharge(charge: VendorCharge) {
    this.updateChargeState(
      charge.id,
      (societyId, targetChargeId) => this.vendorPayments.inactivateCharge(societyId, targetChargeId),
      'Charge inactivated.',
    );
  }

  activateCharge(charge: VendorCharge) {
    this.updateChargeState(
      charge.id,
      (societyId, targetChargeId) => this.vendorPayments.activateCharge(societyId, targetChargeId),
      'Charge activated.',
    );
  }

  deleteCharge(charge: VendorCharge) {
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
        this.loadCharges();
        this.snackBar.open('Charge deleted.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.processingChargeId.set(null),
    });
  }

  protected readonly periodLabel = periodLabel;
  protected readonly monthYearLabel = monthYearLabel;

  private toDateInputValue(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private toMonthInputValue(value: Date) {
    return toMonthInputValue(value);
  }

  private monthInputToIsoDate(value: string) {
    return monthInputToIsoDate(value);
  }

  private updateChargeState(
    chargeId: string,
    requestFactory: (societyId: string, targetChargeId: string) => Observable<unknown>,
    successMessage: string,
  ) {
    const societyId = this.auth.societyId();
    if (!societyId) {
      return;
    }

    this.processingChargeId.set(chargeId);
    requestFactory(societyId, chargeId).subscribe({
      next: () => {
        this.processingChargeId.set(null);
        this.loadCharges();
        this.snackBar.open(successMessage, 'Dismiss', { duration: 4000 });
      },
      error: () => this.processingChargeId.set(null),
    });
  }
}
