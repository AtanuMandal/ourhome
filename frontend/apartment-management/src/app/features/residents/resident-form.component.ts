import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { ApartmentService, UserService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { Apartment, formatApartmentLabel } from '../../core/models/apartment.model';
import { User } from '../../core/models/user.model';

type ResidentType = 'Owner' | 'Tenant' | 'FamilyMember' | 'CoOccupant';
type UserType = 'SUUser' | 'SUSecurity';
const PHONE_PATTERN = /^\d{10}$/;

@Component({
  selector: 'app-resident-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatProgressBarModule, PageHeaderComponent, SearchableSelectComponent],
  template: `
    <app-page-header [title]="pageTitle()" [showBack]="true"></app-page-header>
    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <div class="page-content">
      <div class="card">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>

          @if (isAdmin()) {
            <app-searchable-select label="User Type" formControlName="userType"
              [options]="userTypeOptions"></app-searchable-select>
          }

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Full Name</mat-label>
            <input matInput formControlName="fullName">
            @if (form.controls.fullName.invalid && form.controls.fullName.touched) {
              <mat-error>Full name is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email">
            @if (form.controls.email.invalid && form.controls.email.touched) {
              <mat-error>
                @if (form.controls.email.hasError('duplicate')) {
                  This email already exists in this society.
                } @else {
                  Valid email is required
                }
              </mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Phone</mat-label>
            <input matInput type="tel" formControlName="phone">
            @if (form.controls.phone.invalid && form.controls.phone.touched) {
              <mat-error>
                @if (form.controls.phone.hasError('required')) {
                  Phone is required
                } @else {
                  Phone must be exactly 10 digits
                }
              </mat-error>
            }
          </mat-form-field>

          @if (!isSecurityPersonnel()) {
            <app-searchable-select label="Resident Type" formControlName="residentType"
              [options]="residentTypes()"></app-searchable-select>

            <app-searchable-select label="Apartment" formControlName="apartmentId"
              [options]="apartmentOptions()" errorMessage="Apartment is required"></app-searchable-select>

            @if (!loading() && apartments().length === 0) {
              <p class="mt-8" style="color: var(--warn);">No apartments are available for this society yet.</p>
            }
          }

          @if (duplicateResident()) {
            <div class="card mt-16" style="background:#fff8e1;border:1px solid #ffe082;">
              <div style="font-weight:600;margin-bottom:8px;">Resident already exists</div>
              <div style="margin-bottom:12px;">
                {{ duplicateResident()!.fn ?? duplicateResident()!.nm }} already uses this email.
                Open the resident details page and add another apartment there.
              </div>
              <a mat-stroked-button color="primary"
                 [routerLink]="['/residents', duplicateResident()!.id]"
                 [queryParams]="{ addApartment: 1 }">
                Open Resident Details
              </a>
            </div>
          }

          <button mat-raised-button color="primary" type="submit"
                  class="full-width" style="height:48px;margin-top:8px"
                  [disabled]="loading() || form.invalid || (!isSecurityPersonnel() && apartments().length === 0)">
            {{ isSecurityPersonnel() ? 'Add Security Personnel' : 'Add Resident' }}
          </button>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentFormComponent implements OnInit {
  private readonly fb           = inject(FormBuilder).nonNullable;
  private readonly svc          = inject(UserService);
  private readonly apartmentSvc = inject(ApartmentService);
  private readonly auth         = inject(AuthService);
  private readonly router       = inject(Router);
  private readonly snackBar     = inject(MatSnackBar);
  private readonly destroyRef   = inject(DestroyRef);

  readonly loading = signal(true);
  readonly apartments = signal<Apartment[]>([]);
  readonly duplicateResident = signal<User | null>(null);
  readonly residentTypes = signal<Array<{ value: ResidentType; label: string }>>([]);
  readonly userTypeOptions = [
    { value: 'SUUser' as UserType, label: 'Resident' },
    { value: 'SUSecurity' as UserType, label: 'Security Personnel' },
  ];
  readonly apartmentOptions = computed(() =>
    this.apartments().map(a => ({ value: a.id, label: this.apartmentLabel(a) }))
  );

  readonly isAdmin = this.auth.isAdmin;

  readonly form = this.fb.group({
    userType: ['SUUser' as UserType],
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    residentType: ['Owner' as ResidentType, Validators.required],
    apartmentId: ['', Validators.required],
  });

  isSecurityPersonnel() {
    return this.form.controls.userType.value === 'SUSecurity';
  }

  pageTitle() {
    return this.isSecurityPersonnel() ? 'Add Security Personnel' : 'Add Resident';
  }

  ngOnInit() {
    this.configureResidentTypes();

    const sid = this.auth.societyId();
    if (!sid) {
      this.loading.set(false);
      return;
    }

    this.apartmentSvc.list(sid, 1, 500).subscribe({
      next: response => {
        const apartments = [...(response.items ?? [])].sort((left, right) =>
          formatApartmentLabel(left).localeCompare(formatApartmentLabel(right), undefined, { numeric: true, sensitivity: 'base' }));
        this.apartments.set(apartments);
        this.loading.set(false);
      },
      error: () => {
        this.apartments.set([]);
        this.loading.set(false);
      },
    });

    this.form.controls.email.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.duplicateResident.set(null);
      if (this.form.controls.email.hasError('duplicate')) {
        const errors = { ...(this.form.controls.email.errors ?? {}) };
        delete errors['duplicate'];
        this.form.controls.email.setErrors(Object.keys(errors).length ? errors : null);
      }
    });

    this.form.controls.userType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(type => {
      if (type === 'SUSecurity') {
        this.form.controls.apartmentId.clearValidators();
        this.form.controls.apartmentId.setValue('');
      } else {
        this.form.controls.apartmentId.setValidators(Validators.required);
      }
      this.form.controls.apartmentId.updateValueAndValidity();
    });
  }

  submit() {
    if (this.form.invalid) return;
    const sid = this.auth.societyId();
    if (!sid) return;

    this.loading.set(true);
    const value = this.form.getRawValue();

    this.svc.findByEmail(sid, value.email.trim()).subscribe({
      next: existingResident => {
        if (existingResident) {
          this.loading.set(false);
          this.duplicateResident.set(existingResident);
          this.form.controls.email.setErrors({ ...(this.form.controls.email.errors ?? {}), duplicate: true });
          this.form.controls.email.markAsTouched();
          this.snackBar.open('Resident already exists. Open resident details to add another apartment.', 'Dismiss', { duration: 5000 });
          return;
        }

        const isSecurity = value.userType === 'SUSecurity';
        this.svc.register(sid, {
          fullName: value.fullName.trim(),
          email: value.email.trim(),
          phone: value.phone.trim(),
          role: isSecurity ? 'SUSecurity' : 'SUUser',
          residentType: isSecurity ? 'SocietyAdmin' : value.residentType,
          apartmentId: isSecurity ? undefined : (value.apartmentId || undefined),
        }).subscribe({
          next: () => {
            this.loading.set(false);
            this.router.navigate(['/residents']);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  apartmentLabel(apartment: Apartment) {
    return formatApartmentLabel(apartment);
  }

  private configureResidentTypes() {
    const user = this.auth.user();
    const options = user?.rl === 'SUAdmin'
      ? [{ value: 'Owner' as ResidentType, label: 'Owner' }]
      : user?.rt === 'Owner'
        ? [
            { value: 'Tenant' as ResidentType, label: 'Tenant' },
            { value: 'FamilyMember' as ResidentType, label: 'Family Member' },
          ]
        : user?.rt === 'Tenant'
          ? [{ value: 'CoOccupant' as ResidentType, label: 'Co-Occupant' }]
          : [];

    this.residentTypes.set(options);
    if (options.length > 0) {
      this.form.controls.residentType.setValue(options[0].value);
    } else {
      this.form.controls.residentType.setValue('Owner');
      this.form.controls.residentType.disable();
    }
  }
}
