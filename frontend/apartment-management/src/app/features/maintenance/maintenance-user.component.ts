import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { MaintenancePageBase } from './maintenance-page-base';
import { MAINTENANCE_PAGE_STYLES } from './maintenance-shared';

@Component({
  selector: 'app-maintenance-user',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    PageHeaderComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    StatusChipComponent,
  ],
  template: `
    <app-page-header
      title="Maintenance"
      subtitle="View charges and submit payment proof">
    </app-page-header>

    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else {
        <section class="card card--spaced">
          <div class="section-header">
            <div>
              <h2 class="section-title">My maintenance charges</h2>
              <p class="section-copy">Filter charges by year or month and submit payment proof for pending dues.</p>
            </div>
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
          </form>

          @if (selectableCharges().length) {
            <div class="sub-card stack">
              <div>
                <div class="section-title">Submit payment proof</div>
                <div class="section-copy">Select one or more unpaid charges and share the proof URL for admin approval.</div>
              </div>

              <form [formGroup]="proofForm" (ngSubmit)="submitProof()" class="stack">
                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Proof URL</mat-label>
                  <input matInput formControlName="proofUrl" placeholder="https://...">
                </mat-form-field>

                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Notes</mat-label>
                  <textarea matInput rows="2" formControlName="notes" placeholder="Optional transaction details"></textarea>
                </mat-form-field>

                <div class="action-row">
                  <button mat-raised-button color="primary" type="submit" [disabled]="selectedChargeIds().length === 0 || proofForm.invalid || submittingProof()">
                    Submit proof for {{ selectedChargeIds().length }} charge{{ selectedChargeIds().length === 1 ? '' : 's' }}
                  </button>
                </div>
              </form>
            </div>
          }

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

                      @if (isSelectableCharge(charge)) {
                        <mat-checkbox
                          [checked]="selectedChargeIds().includes(charge.id)"
                          (change)="toggleChargeSelection(charge.id, $event.checked)">
                          Include in proof submission
                        </mat-checkbox>
                      }

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
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <app-empty-state
              icon="receipt_long"
              title="No maintenance charges found"
              message="Your apartment has no maintenance charges for the selected filter.">
            </app-empty-state>
          }
        </section>

        <section class="card card--spaced">
          <div class="section-header">
            <div>
              <h2 class="section-title">Applicable schedules</h2>
              <p class="section-copy">Recurring maintenance schedules affecting your apartment or society.</p>
            </div>
          </div>

          @if (schedules().length) {
            <div class="stack">
              @for (schedule of schedules(); track schedule.id) {
                <div class="sub-card stack">
                  <div class="section-header section-header--compact">
                    <div>
                      <div class="section-title">{{ schedule.name }}</div>
                      <div class="section-copy">
                        {{ schedule.apartmentId ? 'Specific apartment' : 'Entire society' }} ·
                        {{ schedule.frequency }} ·
                        Due on day {{ schedule.dueDay }}
                      </div>
                    </div>
                    <app-status-chip [status]="scheduleStatus(schedule)"></app-status-chip>
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
                </div>
              }
            </div>
          } @else {
            <app-empty-state
              icon="build_circle"
              title="No maintenance schedules found"
              message="There are no maintenance schedules assigned to your apartment yet.">
            </app-empty-state>
          }
        </section>
      }
    </div>
  `,
  styles: [MAINTENANCE_PAGE_STYLES],
})
export class MaintenanceUserComponent extends MaintenancePageBase {
  readonly submittingProof = signal(false);
  readonly selectedChargeIds = signal<string[]>([]);

  readonly proofForm = this.fb.group({
    proofUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\//i)]],
    notes: [''],
  });

  readonly selectableCharges = computed(() => this.charges().filter(charge => this.isSelectableCharge(charge)));

  protected get isAdminView() {
    return false;
  }

  constructor() {
    super();
    this.initializePage(false);
  }

  override refreshCharges() {
    this.selectedChargeIds.set([]);
    super.refreshCharges();
  }

  toggleChargeSelection(chargeId: string, checked: boolean) {
    const current = new Set(this.selectedChargeIds());
    if (checked) current.add(chargeId);
    else current.delete(chargeId);
    this.selectedChargeIds.set(Array.from(current));
  }

  submitProof() {
    const societyId = this.auth.societyId();
    if (!societyId || this.proofForm.invalid || this.selectedChargeIds().length === 0) return;

    this.submittingProof.set(true);
    this.maintenance.submitProof(societyId, {
      chargeIds: this.selectedChargeIds(),
      proofUrl: this.proofForm.controls.proofUrl.value ?? '',
      notes: this.proofForm.controls.notes.value?.trim() || null,
    }).subscribe({
      next: () => {
        this.submittingProof.set(false);
        this.selectedChargeIds.set([]);
        this.proofForm.reset({ proofUrl: '', notes: '' });
        super.refreshCharges();
        this.snackBar.open('Payment proof submitted for review.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.submittingProof.set(false),
    });
  }
}
