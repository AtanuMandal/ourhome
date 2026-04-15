import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ApartmentService, UserService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { Apartment } from '../../core/models/apartment.model';
import { User } from '../../core/models/user.model';

type ResidentType = 'Owner' | 'Tenant' | 'FamilyMember' | 'CoOccupant';
const PHONE_PATTERN = /^\d{10}$/;

@Component({
  selector: 'app-resident-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatProgressBarModule, PageHeaderComponent],
  template: `
    <app-page-header title="Add Resident" [showBack]="true"></app-page-header>
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

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Resident Type</mat-label>
            <select matNativeControl formControlName="residentType">
              @for (residentType of residentTypes(); track residentType.value) {
                <option [value]="residentType.value">{{ residentType.label }}</option>
              }
            </select>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Apartment</mat-label>
            <select matNativeControl formControlName="apartmentId">
              <option value="" disabled>Select an apartment</option>
              @for (apartment of apartments(); track apartment.id) {
                <option [value]="apartment.id">{{ apartmentLabel(apartment) }}</option>
              }
            </select>
            @if (form.controls.apartmentId.invalid && form.controls.apartmentId.touched) {
              <mat-error>Apartment is required</mat-error>
            }
          </mat-form-field>

          @if (!loading() && apartments().length === 0) {
            <p class="mt-8" style="color: var(--warn);">No apartments are available for this society yet.</p>
          }

          @if (duplicateResident()) {
            <div class="card mt-16" style="background:#fff8e1;border:1px solid #ffe082;">
              <div style="font-weight:600;margin-bottom:8px;">Resident already exists</div>
              <div style="margin-bottom:12px;">
                {{ duplicateResident()!.fullName ?? duplicateResident()!.name }} already uses this email.
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
                  [disabled]="loading() || form.invalid || apartments().length === 0">
            Add Resident
          </button>
        </form>
      </div>
    </div>
  `,
})
export class ResidentFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly svc = inject(UserService);
  private readonly apartmentSvc = inject(ApartmentService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly apartments = signal<Apartment[]>([]);
  readonly duplicateResident = signal<User | null>(null);
  readonly residentTypes = signal<Array<{ value: ResidentType; label: string }>>([]);

  readonly form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    residentType: ['Owner' as ResidentType, Validators.required],
    apartmentId: ['', Validators.required],
  });

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
          left.apartmentNumber.localeCompare(right.apartmentNumber, undefined, { numeric: true, sensitivity: 'base' }));
        this.apartments.set(apartments);
        this.loading.set(false);
      },
      error: () => {
        this.apartments.set([]);
        this.loading.set(false);
      },
    });

    this.form.controls.email.valueChanges.subscribe(() => {
      this.duplicateResident.set(null);
      if (this.form.controls.email.hasError('duplicate')) {
        const errors = { ...(this.form.controls.email.errors ?? {}) };
        delete errors['duplicate'];
        this.form.controls.email.setErrors(Object.keys(errors).length ? errors : null);
      }
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

        this.svc.register(sid, {
          fullName: value.fullName.trim(),
          email: value.email.trim(),
          phone: value.phone.trim(),
          role: 'SUUser',
          residentType: value.residentType,
          apartmentId: value.apartmentId || undefined,
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
    return apartment.blockName ? `${apartment.apartmentNumber} - ${apartment.blockName}` : apartment.apartmentNumber;
  }

  private configureResidentTypes() {
    const user = this.auth.user();
    const options = user?.role === 'SUAdmin'
      ? [{ value: 'Owner' as ResidentType, label: 'Owner' }]
      : user?.residentType === 'Owner'
        ? [
            { value: 'Tenant' as ResidentType, label: 'Tenant' },
            { value: 'FamilyMember' as ResidentType, label: 'Family Member' },
          ]
        : user?.residentType === 'Tenant'
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
