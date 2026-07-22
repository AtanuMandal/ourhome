import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { StaffService, ShiftService } from '../../core/services/staff.service';
import { AuthService } from '../../core/services/auth.service';
import { Shift, StaffCategory, StaffEmploymentType } from '../../core/models/staff.model';

const PHONE_PATTERN = /^\d{10}$/;

const CATEGORY_OPTIONS: Array<{ value: StaffCategory; label: string }> = [
  { value: 'Security', label: 'Security' },
  { value: 'Housekeeping', label: 'Housekeeping' },
  { value: 'Gardener', label: 'Gardener' },
  { value: 'Plumber', label: 'Plumber' },
  { value: 'Electrician', label: 'Electrician' },
  { value: 'Other', label: 'Other' },
];

const EMPLOYMENT_TYPE_OPTIONS: Array<{ value: StaffEmploymentType; label: string }> = [
  { value: 'OnPayroll', label: 'On Payroll' },
  { value: 'Contractor', label: 'Contractor' },
];

@Component({
  selector: 'app-staff-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule,
            MatProgressBarModule, PageHeaderComponent, SearchableSelectComponent],
  template: `
    <app-page-header [title]="isEditMode() ? 'Edit Staff' : 'Add Staff'" [showBack]="true"></app-page-header>
    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <div class="page-content">
      <div class="card">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Full Name</mat-label>
            <input matInput formControlName="fullName">
            @if (form.controls.fullName.invalid && form.controls.fullName.touched) {
              <mat-error>Full name is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Phone</mat-label>
            <input matInput type="tel" formControlName="phone">
            @if (form.controls.phone.invalid && form.controls.phone.touched) {
              <mat-error>Phone must be exactly 10 digits</mat-error>
            }
          </mat-form-field>

          @if (!isEditMode()) {
            <app-searchable-select label="Category" formControlName="category"
              [options]="categoryOptions"></app-searchable-select>

            <app-searchable-select label="Employment Type" formControlName="employmentType"
              [options]="employmentTypeOptions"></app-searchable-select>
          }

          <app-searchable-select label="Shift (optional)" formControlName="shiftId"
            [options]="shiftOptions()"></app-searchable-select>

          @if (!loading() && shifts().length === 0) {
            <p class="mt-8" style="color: var(--text-secondary);">No shifts defined yet — staff can be assigned a shift later.</p>
          }

          <button mat-raised-button color="primary" type="submit"
                  class="full-width" style="height:48px;margin-top:8px"
                  [disabled]="saving() || form.invalid">
            {{ isEditMode() ? 'Save Changes' : 'Add Staff' }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class StaffFormComponent implements OnInit {
  private readonly fb        = inject(FormBuilder).nonNullable;
  private readonly staffSvc  = inject(StaffService);
  private readonly shiftSvc  = inject(ShiftService);
  private readonly auth      = inject(AuthService);
  private readonly route     = inject(ActivatedRoute);
  private readonly router    = inject(Router);
  private readonly snackBar  = inject(MatSnackBar);

  readonly categoryOptions = CATEGORY_OPTIONS;
  readonly employmentTypeOptions = EMPLOYMENT_TYPE_OPTIONS;

  readonly loading = signal(true);
  readonly saving  = signal(false);
  readonly shifts  = signal<Shift[]>([]);
  readonly staffId = signal<string | null>(null);

  readonly isEditMode = computed(() => this.staffId() !== null);
  readonly shiftOptions = computed(() => [
    { value: '', label: 'No shift' },
    ...this.shifts().map(s => ({ value: s.id, label: s.nm })),
  ]);

  readonly form = this.fb.group({
    fullName: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    category: ['Security' as StaffCategory, Validators.required],
    employmentType: ['OnPayroll' as StaffEmploymentType, Validators.required],
    shiftId: [''],
  });

  ngOnInit() {
    const sid = this.auth.societyId();
    const id = this.route.snapshot.paramMap.get('id');
    this.staffId.set(id);

    if (!sid) { this.loading.set(false); return; }

    this.shiftSvc.list(sid).subscribe({
      next: shifts => this.shifts.set(shifts ?? []),
      error: () => {},
    });

    if (id) {
      this.staffSvc.get(sid, id).subscribe({
        next: staff => {
          this.form.patchValue({
            fullName: staff.fn,
            phone: staff.ph,
            shiftId: staff.sid ?? '',
          });
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      this.loading.set(false);
    }
  }

  submit() {
    if (this.form.invalid) return;
    const sid = this.auth.societyId();
    if (!sid) return;

    this.saving.set(true);
    const value = this.form.getRawValue();
    const shiftId = value.shiftId || undefined;

    const request$ = this.isEditMode()
      ? this.staffSvc.update(sid, this.staffId()!, {
          fullName: value.fullName.trim(),
          phone: value.phone.trim(),
          shiftId,
        })
      : this.staffSvc.create(sid, {
          fullName: value.fullName.trim(),
          phone: value.phone.trim(),
          category: value.category,
          employmentType: value.employmentType,
          shiftId,
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(this.isEditMode() ? 'Staff member updated.' : 'Staff member added.', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/staff']);
      },
      error: () => this.saving.set(false),
    });
  }
}
