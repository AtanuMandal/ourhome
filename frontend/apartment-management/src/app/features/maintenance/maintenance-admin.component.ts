import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { MaintenanceAreaBasis, MaintenanceFrequency, MaintenancePricingType, MaintenanceSchedule } from '../../core/models/maintenance.model';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { MaintenancePageBase } from './maintenance-page-base';
import {
  AREA_BASIS_OPTIONS,
  FREQUENCY_OPTIONS,
  MAINTENANCE_PAGE_STYLES,
  PRICING_TYPE_OPTIONS,
  ScheduleScope,
  SCOPE_OPTIONS,
} from './maintenance-shared';

@Component({
  selector: 'app-maintenance-admin',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    RouterLink,
    PageHeaderComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    StatusChipComponent,
  ],
  template: `
    <app-page-header
      title="Maintenance"
      subtitle="Schedules, dues, and approvals">
    </app-page-header>

    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else {
        <section #scheduleEditor class="card card--spaced">
          <div class="section-header">
            <div>
              <h2 class="section-title">{{ editingScheduleId() ? 'Edit schedule' : 'Create schedule' }}</h2>
              <p class="section-copy">Create society-wide or apartment-specific maintenance schedules with fixed or area-based pricing.</p>
            </div>
            @if (editingScheduleId()) {
              <button mat-stroked-button type="button" (click)="resetScheduleForm()">Cancel edit</button>
            }
          </div>

          <form [formGroup]="scheduleForm" (ngSubmit)="saveSchedule()" class="stack">
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Schedule name</mat-label>
              <input #scheduleNameInput matInput formControlName="name">
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Description</mat-label>
              <textarea matInput rows="3" formControlName="description"></textarea>
            </mat-form-field>

            <div class="two-col">
              <mat-form-field appearance="fill">
                <mat-label>Scope</mat-label>
                <select matNativeControl formControlName="scope" (change)="onScopeChanged()">
                  @for (scope of scopeOptions; track scope.value) {
                    <option [ngValue]="scope.value">{{ scope.label }}</option>
                  }
                </select>
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>Frequency</mat-label>
                <select matNativeControl formControlName="frequency">
                  @for (frequency of frequencyOptions; track frequency) {
                    <option [ngValue]="frequency">{{ frequency }}</option>
                  }
                </select>
              </mat-form-field>
            </div>

            @if (scheduleForm.controls.scope.value === 'Apartment') {
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Apartment</mat-label>
                <select matNativeControl formControlName="apartmentId">
                  @for (apartment of apartments(); track apartment.id) {
                    <option [ngValue]="apartment.id">{{ apartment.blockName }}-{{ apartment.apartmentNumber }}</option>
                  }
                </select>
              </mat-form-field>
            }

            <div class="two-col">
              <mat-form-field appearance="fill">
                <mat-label>Pricing type</mat-label>
                <select matNativeControl formControlName="pricingType" (change)="onPricingTypeChanged()">
                  @for (type of pricingTypeOptions; track type.value) {
                    <option [ngValue]="type.value">{{ type.label }}</option>
                  }
                </select>
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>Rate</mat-label>
                <input matInput type="number" min="0.01" step="0.01" formControlName="rate">
              </mat-form-field>
            </div>

            <div class="two-col">
              <mat-form-field appearance="fill">
                <mat-label>Area basis</mat-label>
                <select matNativeControl formControlName="areaBasis">
                  @for (basis of areaBasisOptions; track basis.value) {
                    <option [ngValue]="basis.value">{{ basis.label }}</option>
                  }
                </select>
              </mat-form-field>

              <mat-form-field appearance="fill">
                <mat-label>Due day</mat-label>
                <input matInput type="number" min="1" max="28" formControlName="dueDay">
              </mat-form-field>
            </div>

            @if (editingScheduleId()) {
              <div class="two-col">
                <mat-form-field appearance="fill">
                  <mat-label>Status</mat-label>
                  <select matNativeControl formControlName="isActive">
                    <option [ngValue]="true">Active</option>
                    <option [ngValue]="false">Inactive</option>
                  </select>
                </mat-form-field>

                <mat-form-field appearance="fill">
                  <mat-label>Change reason</mat-label>
                  <input matInput formControlName="changeReason">
                </mat-form-field>
              </div>
            }

            <div class="action-row">
              <button mat-raised-button color="primary" type="submit" [disabled]="scheduleForm.invalid || savingSchedule()">
                {{ editingScheduleId() ? 'Update schedule' : 'Create schedule' }}
              </button>
            </div>
          </form>
        </section>

        <section class="card card--spaced">
          <div class="section-header">
            <div>
              <h2 class="section-title">Charge register</h2>
              <p class="section-copy">Filter by year, month, or payment status and track overdue dues.</p>
            </div>
            <button mat-stroked-button color="primary" routerLink="/maintenance/admin/grid" type="button">
              Open payment grid
            </button>
          </div>

          <form [formGroup]="filterForm" class="filters">
            <mat-form-field appearance="fill">
              <mat-label>Year</mat-label>
              <select matNativeControl formControlName="year" (change)="refreshCharges()">
                <option [ngValue]="null">All years</option>
                @for (year of yearOptions(); track year) {
                  <option [ngValue]="year">{{ year }}</option>
                }
              </select>
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Month</mat-label>
              <select matNativeControl formControlName="month" (change)="refreshCharges()">
                <option [ngValue]="null">All months</option>
                @for (month of monthOptions; track month.value) {
                  <option [ngValue]="month.value">{{ month.label }}</option>
                }
              </select>
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Status</mat-label>
              <select matNativeControl formControlName="status" (change)="refreshCharges()">
                <option [ngValue]="null">All statuses</option>
                @for (status of chargeStatusOptions; track status) {
                  <option [ngValue]="status">{{ status }}</option>
                }
              </select>
            </mat-form-field>
          </form>

          <div class="sub-card stack">
            <div>
              <div class="section-title">Admin payment details</div>
              <div class="section-copy">These values are applied when you approve a submitted proof or mark a charge paid manually.</div>
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
          </div>

          @if (chargesLoading()) {
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          }

          @if (chargeSections().length) {
            <div class="stack">
              @for (section of chargeSections(); track section.key) {
                <div class="sub-card stack">
                  <div class="section-header section-header--compact">
                    <div>
                      <div class="section-title">{{ section.label }}</div>
                      <div class="section-copy">{{ section.charges.length }} charge{{ section.charges.length === 1 ? '' : 's' }} · {{ section.totalAmount | currency:'INR':'symbol':'1.2-2' }}</div>
                    </div>
                  </div>

                  @for (charge of section.charges; track charge.id) {
                    <div class="charge-card" [class.charge-card--overdue]="charge.isOverdue">
                      <div class="charge-card__header">
                        <div class="charge-card__meta">
                          <div class="charge-card__title">{{ charge.scheduleName }}</div>
                          <div class="charge-card__sub">
                            Apt {{ charge.apartmentNumber }} · Due {{ charge.dueDate | date:'mediumDate' }}
                          </div>
                        </div>
                        <app-status-chip [status]="charge.status"></app-status-chip>
                      </div>

                      <div class="charge-card__details">
                        <span>Amount: {{ charge.amount | currency:'INR':'symbol':'1.2-2' }}</span>
                        @if (charge.isOverdue) {
                          <span class="text-danger">Overdue</span>
                        }
                        @if (charge.transactionReference) {
                          <span>Ref: {{ charge.transactionReference }}</span>
                        }
                        @if (charge.paidAt) {
                          <span>Paid: {{ charge.paidAt | date:'mediumDate' }}</span>
                        }
                      </div>

                      @if (charge.proofs.length) {
                        <div class="proof-list">
                          <div class="section-copy proof-list__title">Submitted proofs</div>
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
                          <button
                            mat-raised-button
                            color="primary"
                            type="button"
                            [disabled]="processingChargeId() === charge.id || settlementForm.invalid"
                            (click)="approveProof(charge)">
                            Approve proof
                          </button>
                        }

                        @if (charge.status !== 'Paid') {
                          <button
                            mat-stroked-button
                            color="primary"
                            type="button"
                            [disabled]="processingChargeId() === charge.id || settlementForm.invalid"
                            (click)="markPaid(charge)">
                            Mark paid
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <app-empty-state
              icon="receipt_long"
              title="No maintenance charges found"
              message="Charges will appear here once schedules generate dues.">
            </app-empty-state>
          }
        </section>

        <section class="card card--spaced">
          <div class="section-header">
            <div>
              <h2 class="section-title">Schedules</h2>
              <p class="section-copy">Recurring maintenance configurations and their latest change history.</p>
            </div>
          </div>

          @if (schedules().length) {
            <div class="stack">
              @for (schedule of schedules(); track schedule.id) {
                <div class="sub-card stack" [class.sub-card--active]="editingScheduleId() === schedule.id">
                  <div class="section-header section-header--compact">
                    <div>
                      <div class="section-title">{{ schedule.name }}</div>
                      <div class="section-copy">
                        {{ schedule.apartmentId ? apartmentLabel(schedule.apartmentId) : 'Entire society' }} ·
                        {{ schedule.frequency }} ·
                        Due on day {{ schedule.dueDay }}
                      </div>
                    </div>
                    <app-status-chip [status]="schedule.isActive ? 'Active' : 'Inactive'"></app-status-chip>
                  </div>

                  <div class="charge-card__details">
                    <span>Rate: {{ schedule.rate | currency:'INR':'symbol':'1.2-2' }}</span>
                    <span>{{ schedule.pricingType === 'PerSquareFoot' ? 'Per sq. ft.' : 'Fixed amount' }}</span>
                    @if (schedule.areaBasis) {
                      <span>{{ formatAreaBasis(schedule.areaBasis) }}</span>
                    }
                    <span>Next due: {{ schedule.nextDueDate | date:'mediumDate' }}</span>
                  </div>

                  @if (schedule.description) {
                    <div class="section-copy">{{ schedule.description }}</div>
                  }

                  @if (schedule.changeHistory.length) {
                    <div class="proof-list">
                      <div class="section-copy proof-list__title">Change history</div>
                      @for (change of schedule.changeHistory; track change.changedAt + change.reason) {
                        <div class="proof-item">
                          <span>{{ change.changedAt | date:'mediumDate' }} · {{ change.changedByUserName }}</span>
                          <span>{{ change.reason }}</span>
                          <span>{{ change.previousRate | currency:'INR':'symbol':'1.2-2' }} → {{ change.newRate | currency:'INR':'symbol':'1.2-2' }}</span>
                        </div>
                      }
                    </div>
                  }

                  <div class="action-row action-row--compact">
                    <button mat-stroked-button color="primary" type="button" (click)="$event.stopPropagation(); editSchedule(schedule)">Edit schedule</button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <app-empty-state
              icon="build_circle"
              title="No schedules configured"
              message="Create a maintenance schedule to begin generating charges.">
            </app-empty-state>
          }
        </section>
      }
    </div>
  `,
  styles: [MAINTENANCE_PAGE_STYLES],
})
export class MaintenanceAdminComponent extends MaintenancePageBase {
  readonly scheduleEditor = viewChild<ElementRef<HTMLElement>>('scheduleEditor');
  readonly scheduleNameInput = viewChild<ElementRef<HTMLInputElement>>('scheduleNameInput');
  readonly savingSchedule = signal(false);
  readonly processingChargeId = signal<string | null>(null);

  readonly scopeOptions = SCOPE_OPTIONS;
  readonly pricingTypeOptions = PRICING_TYPE_OPTIONS;
  readonly areaBasisOptions = AREA_BASIS_OPTIONS;
  readonly frequencyOptions = FREQUENCY_OPTIONS;

  readonly settlementForm = this.fb.group({
    paymentMethod: ['Manual', Validators.required],
    transactionReference: [''],
    receiptUrl: [''],
    notes: [''],
  });

  readonly scheduleForm = this.fb.group({
    id: [''],
    name: ['', Validators.required],
    description: [''],
    scope: ['Society' as ScheduleScope, Validators.required],
    apartmentId: [''],
    rate: [1, [Validators.required, Validators.min(0.01)]],
    pricingType: ['FixedAmount' as MaintenancePricingType, Validators.required],
    areaBasis: ['' as MaintenanceAreaBasis | ''],
    frequency: ['Monthly' as MaintenanceFrequency, Validators.required],
    dueDay: [5, [Validators.required, Validators.min(1), Validators.max(28)]],
    isActive: [true],
    changeReason: [''],
  });

  readonly editingScheduleId = signal<string | null>(null);

  protected get isAdminView() {
    return true;
  }

  constructor() {
    super();
    this.onScopeChanged();
    this.onPricingTypeChanged();
    this.initializePage(true);
  }

  saveSchedule() {
    const societyId = this.auth.societyId();
    if (!societyId || this.scheduleForm.invalid) return;
    if (this.editingScheduleId() && !this.scheduleForm.controls.changeReason.value?.trim()) return;

    const formValue = this.scheduleForm.getRawValue();
    const isEditing = !!this.editingScheduleId();
    const dto = {
      name: formValue.name ?? '',
      description: formValue.description?.trim() || null,
      apartmentId: formValue.scope === 'Apartment' ? formValue.apartmentId || null : null,
      rate: Number(formValue.rate ?? 0),
      pricingType: formValue.pricingType as MaintenancePricingType,
      areaBasis: formValue.pricingType === 'PerSquareFoot' && formValue.areaBasis ? formValue.areaBasis as MaintenanceAreaBasis : null,
      frequency: formValue.frequency as MaintenanceFrequency,
      dueDay: Number(formValue.dueDay ?? 1),
    };

    this.savingSchedule.set(true);
    const request = isEditing
      ? this.maintenance.updateSchedule(societyId, this.editingScheduleId()!, {
          ...dto,
          isActive: !!formValue.isActive,
          changeReason: formValue.changeReason?.trim() ?? '',
        })
      : this.maintenance.createSchedule(societyId, dto);

    request.subscribe({
      next: () => {
        this.savingSchedule.set(false);
        this.resetScheduleForm();
        this.loadSchedules(societyId);
        this.refreshCharges();
        this.snackBar.open(isEditing ? 'Maintenance schedule updated.' : 'Maintenance schedule created.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.savingSchedule.set(false),
    });
  }

  editSchedule(schedule: MaintenanceSchedule) {
    this.editingScheduleId.set(schedule.id);
    this.scheduleForm.patchValue({
      id: schedule.id,
      name: schedule.name,
      description: schedule.description ?? '',
      scope: schedule.apartmentId ? 'Apartment' : 'Society',
      apartmentId: schedule.apartmentId ?? '',
      rate: schedule.rate,
      pricingType: schedule.pricingType,
      areaBasis: schedule.areaBasis ?? '',
      frequency: schedule.frequency,
      dueDay: schedule.dueDay,
      isActive: schedule.isActive,
      changeReason: '',
    });
    this.onScopeChanged();
    this.onPricingTypeChanged();
    queueMicrotask(() => {
      this.scheduleEditor()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.scheduleNameInput()?.nativeElement.focus();
    });
  }

  resetScheduleForm() {
    this.editingScheduleId.set(null);
    this.scheduleForm.reset({
      id: '',
      name: '',
      description: '',
      scope: 'Society',
      apartmentId: '',
      rate: 1,
      pricingType: 'FixedAmount',
      areaBasis: '',
      frequency: 'Monthly',
      dueDay: 5,
      isActive: true,
      changeReason: '',
    });
    this.onScopeChanged();
    this.onPricingTypeChanged();
  }

  onPricingTypeChanged() {
    const areaBasisControl = this.scheduleForm.controls.areaBasis;
    if (this.scheduleForm.controls.pricingType.value === 'PerSquareFoot') {
      areaBasisControl.setValidators([Validators.required]);
      areaBasisControl.enable({ emitEvent: false });
      if (!areaBasisControl.value) {
        areaBasisControl.setValue('CarpetArea', { emitEvent: false });
      }
      areaBasisControl.updateValueAndValidity({ emitEvent: false });
      return;
    }

    areaBasisControl.clearValidators();
    areaBasisControl.setValue('', { emitEvent: false });
    areaBasisControl.disable({ emitEvent: false });
    areaBasisControl.updateValueAndValidity({ emitEvent: false });
  }

  onScopeChanged() {
    const apartmentControl = this.scheduleForm.controls.apartmentId;
    if (this.scheduleForm.controls.scope.value === 'Apartment') {
      apartmentControl.setValidators([Validators.required]);
      apartmentControl.enable({ emitEvent: false });
      apartmentControl.updateValueAndValidity({ emitEvent: false });
      return;
    }

    apartmentControl.clearValidators();
    apartmentControl.setValue('', { emitEvent: false });
    apartmentControl.disable({ emitEvent: false });
    apartmentControl.updateValueAndValidity({ emitEvent: false });
  }

  approveProof(chargeId: { id: string }) {
    this.processCharge(chargeId.id, () =>
      this.maintenance.approveProof(this.auth.societyId()!, chargeId.id, this.settlementPayload())
    , 'Maintenance proof approved.');
  }

  markPaid(chargeId: { id: string }) {
    this.processCharge(chargeId.id, () =>
      this.maintenance.markPaid(this.auth.societyId()!, chargeId.id, this.settlementPayload())
    , 'Maintenance charge marked as paid.');
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
        this.refreshCharges();
        this.snackBar.open(successMessage, 'Dismiss', { duration: 4000 });
      },
      error: () => this.processingChargeId.set(null),
    });
  }
}
