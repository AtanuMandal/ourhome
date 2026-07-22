import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { MaintenanceFrequency, MaintenanceProofUploadResponse } from '../../core/models/maintenance.model';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { FilePreviewComponent } from '../../shared/components/file-preview/file-preview.component';
import { ImageLightboxComponent } from '../../shared/components/image-lightbox/image-lightbox.component';
import { MaintenancePageBase } from './maintenance-page-base';
import { MAINTENANCE_PAGE_STYLES, formatFrequencyLabel } from './maintenance-shared';

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
    SearchableSelectComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    StatusChipComponent,
    FilePreviewComponent,
    ImageLightboxComponent,
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
            <app-searchable-select label="Year" formControlName="year"
              [options]="yearSelectOptions()" (selectionChange)="refreshCharges()"></app-searchable-select>
            <app-searchable-select label="Month" formControlName="month"
              [options]="monthSelectOptions" (selectionChange)="refreshCharges()"></app-searchable-select>
          </form>

          @if (selectableCharges().length) {
            <div class="sub-card stack">
              <div>
                <div class="section-title">Submit payment proof</div>
                <div class="section-copy">Select one or more unpaid charges and upload a payment proof for admin approval.</div>
              </div>

              <form [formGroup]="proofForm" (ngSubmit)="submitProof()" class="stack">
                <div class="stack">
                  <label class="section-copy" for="maintenance-proof-file">Proof file</label>
                  <input id="maintenance-proof-file" type="file" [accept]="acceptedProofTypes" (change)="onProofFileSelected($event)">
                  <span class="section-copy">Accepted: JPEG, PNG, PDF, Word, or Excel.</span>
                  @if (uploadedProof(); as uploadedProof) {
                    <div class="proof-item">
                      <span class="proof-list__title">{{ uploadedProof.fn }}</span>
                      <app-file-preview [src]="uploadedProof.fu" alt="Payment proof preview" imgClass="proof-thumb"
                        [clickable]="true" (imageClick)="lightboxSrc.set(uploadedProof.fu)"></app-file-preview>
                    </div>
                  }
                </div>

                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Notes</mat-label>
                  <textarea matInput rows="2" formControlName="notes" placeholder="Optional transaction details"></textarea>
                </mat-form-field>

                <div class="action-row">
                  <button mat-raised-button color="primary" type="submit" [disabled]="selectedChargeIds().length === 0 || !uploadedProof() || proofForm.invalid || submittingProof() || uploadingProof()">
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
                    <div class="charge-card" [class.charge-card--overdue]="charge.ov">
                      <div class="charge-card__header">
                        <div class="charge-card__meta">
                          <div class="charge-card__title">{{ charge.snm }}</div>
                          <div class="charge-card__sub">
                            Apt {{ charge.anm }} · Due {{ charge.dd | date:'mediumDate' }}
                          </div>
                        </div>
                        <app-status-chip [status]="charge.st"></app-status-chip>
                      </div>

                      <div class="charge-card__details">
                        <span>Amount: {{ charge.amt | currency:'INR':'symbol':'1.2-2' }}</span>
                        @if (charge.ov) {
                          <span class="text-danger">Overdue</span>
                        }
                        @if (charge.tr) {
                          <span>Ref: {{ charge.tr }}</span>
                        }
                        @if (charge.pa) {
                          <span>Paid: {{ charge.pa | date:'mediumDate' }}</span>
                        }
                      </div>

                      @if (charge.st === 'Rejected' && charge.rr) {
                        <div class="section-copy text-danger">Denied: {{ charge.rr }}</div>
                      }

                      @if (isSelectableCharge(charge)) {
                        <mat-checkbox
                          [checked]="selectedChargeIds().includes(charge.id)"
                          (change)="toggleChargeSelection(charge.id, $event.checked)">
                          Include in proof submission
                        </mat-checkbox>
                      }

                      @if (charge.pf.length) {
                        <div class="proof-list">
                          <div class="section-copy proof-list__title">Submitted proofs</div>
                          @for (proof of charge.pf; track proof.pu + proof.sa) {
                            <div class="proof-item">
                              <app-file-preview [src]="proof.pu" alt="Payment proof" imgClass="proof-thumb"
                                [clickable]="true" (imageClick)="lightboxSrc.set(proof.pu)"></app-file-preview>
                              <span>{{ proof.sa | date:'medium' }}</span>
                              @if (proof.nt) {
                                <span>{{ proof.nt }}</span>
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
                      <div class="section-title">{{ schedule.nm }}</div>
                      <div class="section-copy">
                        {{ schedule.aid ? 'Specific apartment' : 'Entire society' }} ·
                        {{ formatFrequency(schedule.fq) }} ·
                        Due on day {{ schedule.dd }}
                      </div>
                    </div>
                    <app-status-chip [status]="scheduleStatus(schedule)"></app-status-chip>
                  </div>

                  <div class="charge-card__details">
                    <span>Rate: {{ schedule.rt | currency:'INR':'symbol':'1.2-2' }}</span>
                    <span>{{ schedule.pt === 'PerSquareFoot' ? 'Per sq. ft.' : 'Fixed amount' }}</span>
                    @if (schedule.ab) {
                      <span>{{ formatAreaBasis(schedule.ab) }}</span>
                    }
                    <span>Active until: {{ schedule.aud | date:'MMM yyyy' }}</span>
                    <span>Next due: {{ schedule.ndd | date:'mediumDate' }}</span>
                  </div>

                  @if (schedule.ds) {
                    <div class="section-copy">{{ schedule.ds }}</div>
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

    <app-image-lightbox [open]="!!lightboxSrc()" [src]="lightboxSrc() ?? ''" (closed)="lightboxSrc.set(null)"></app-image-lightbox>
  `,
  styles: [MAINTENANCE_PAGE_STYLES, `.proof-thumb { width: 64px; height: 64px; border-radius: 8px; object-fit: cover; }`],
})
export class MaintenanceUserComponent extends MaintenancePageBase {
  readonly submittingProof = signal(false);
  readonly uploadingProof = signal(false);
  readonly selectedChargeIds = signal<string[]>([]);
  readonly uploadedProof = signal<MaintenanceProofUploadResponse | null>(null);
  readonly lightboxSrc = signal<string | null>(null);

  readonly proofForm = this.fb.group({
    notes: [''],
  });

  readonly acceptedProofTypes = '.jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx';
  private readonly acceptedProofExtensions = new Set(['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx']);

  readonly selectableCharges = computed(() => this.charges().filter(charge => this.isSelectableCharge(charge)));

  protected get isAdminView() {
    return false;
  }

  constructor() {
    super();
    this.initializePage(false);
  }

  formatFrequency(frequency: MaintenanceFrequency) {
    return formatFrequencyLabel(frequency);
  }

  // A background auto-refresh tick must not wipe out a selection or an upload the resident is
  // still in the middle of — only an explicit refresh (filter change, post-submit) resets them.
  override refreshCharges(isBackgroundRefresh = false) {
    if (!isBackgroundRefresh) {
      this.selectedChargeIds.set([]);
      this.uploadedProof.set(null);
    }
    super.refreshCharges(isBackgroundRefresh);
  }

  toggleChargeSelection(chargeId: string, checked: boolean) {
    const current = new Set(this.selectedChargeIds());
    if (checked) current.add(chargeId);
    else current.delete(chargeId);
    this.selectedChargeIds.set(Array.from(current));
  }

  onProofFileSelected(event: Event) {
    const societyId = this.auth.societyId();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!societyId || !file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!this.acceptedProofExtensions.has(extension)) {
      this.snackBar.open('Unsupported file type. Please upload a JPEG, PNG, PDF, Word, or Excel file.', 'Dismiss', { duration: 5000 });
      input.value = '';
      return;
    }

    this.uploadingProof.set(true);
    this.maintenance.uploadProof(societyId, file).subscribe({
      next: result => {
        this.uploadingProof.set(false);
        this.uploadedProof.set(result);
      },
      error: () => {
        this.uploadingProof.set(false);
        input.value = '';
      },
    });
  }

  submitProof() {
    const societyId = this.auth.societyId();
    if (!societyId || this.proofForm.invalid || this.selectedChargeIds().length === 0 || !this.uploadedProof()) return;

    this.submittingProof.set(true);
    this.maintenance.submitProof(societyId, {
      chargeIds: this.selectedChargeIds(),
      proofUrl: this.uploadedProof()!.fu,
      notes: this.proofForm.controls.notes.value?.trim() || null,
    }).subscribe({
      next: () => {
        this.submittingProof.set(false);
        this.selectedChargeIds.set([]);
        this.uploadedProof.set(null);
        this.proofForm.reset({ notes: '' });
        super.refreshCharges();
        this.snackBar.open('Payment proof submitted for review.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.submittingProof.set(false),
    });
  }
}
