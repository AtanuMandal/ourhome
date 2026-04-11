import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { UserService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';

type ResidentType = 'SocietyAdmin' | 'Owner' | 'Tenant' | 'FamilyMember' | 'CoOccupant';
type UserRole = 'SUUser' | 'SUAdmin';

@Component({
  selector: 'app-resident-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
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
              <mat-error>Valid email is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Phone</mat-label>
            <input matInput type="tel" formControlName="phone">
            @if (form.controls.phone.invalid && form.controls.phone.touched) {
              <mat-error>Phone is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Role</mat-label>
            <mat-select formControlName="role">
              <mat-option value="SUUser">Resident (User)</mat-option>
              <mat-option value="SUAdmin">Society Admin</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Resident Type</mat-label>
            <mat-select formControlName="residentType">
              <mat-option value="SocietyAdmin">Society Admin</mat-option>
              <mat-option value="Owner">Owner</mat-option>
              <mat-option value="Tenant">Tenant</mat-option>
              <mat-option value="FamilyMember">Family Member</mat-option>
              <mat-option value="CoOccupant">Co-Occupant</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Apartment ID</mat-label>
            <input matInput formControlName="apartmentId" [placeholder]="apartmentRequired() ? 'Required for resident accounts' : 'Not required for society admins'">
            @if (form.controls.apartmentId.invalid && form.controls.apartmentId.touched) {
              <mat-error>Apartment ID is required for non-admin residents</mat-error>
            }
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit"
                  class="full-width" style="height:48px;margin-top:8px"
                  [disabled]="loading() || form.invalid">
            Add Resident
          </button>
        </form>
      </div>
    </div>
  `,
})
export class ResidentFormComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly svc = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);

  readonly form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    role: ['SUUser' as UserRole, Validators.required],
    residentType: ['Owner' as ResidentType, Validators.required],
    apartmentId: [''],
  });

  constructor() {
    this.form.controls.role.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(role => {
        if (role === 'SUAdmin') {
          this.form.patchValue({ residentType: 'SocietyAdmin', apartmentId: '' }, { emitEvent: false });
        } else if (this.form.controls.residentType.value === 'SocietyAdmin') {
          this.form.patchValue({ residentType: 'Owner' }, { emitEvent: false });
        }
        this.syncApartmentValidation();
      });

    this.form.controls.residentType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(residentType => {
        if (residentType === 'SocietyAdmin') {
          this.form.patchValue({ role: 'SUAdmin', apartmentId: '' }, { emitEvent: false });
        } else if (this.form.controls.role.value === 'SUAdmin') {
          this.form.patchValue({ role: 'SUUser' }, { emitEvent: false });
        }
        this.syncApartmentValidation();
      });

    this.syncApartmentValidation();
  }

  apartmentRequired() {
    return this.form.controls.role.value === 'SUUser';
  }

  submit() {
    if (this.form.invalid) return;
    const sid = this.auth.societyId();
    if (!sid) return;

    this.loading.set(true);
    const value = this.form.getRawValue();
    this.svc.register(sid, {
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      role: value.role,
      residentType: value.residentType,
      apartmentId: value.apartmentId.trim() || undefined,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/residents']);
      },
      error: () => this.loading.set(false),
    });
  }

  private syncApartmentValidation() {
    if (this.apartmentRequired()) {
      this.form.controls.apartmentId.setValidators([Validators.required]);
    } else {
      this.form.controls.apartmentId.clearValidators();
    }
    this.form.controls.apartmentId.updateValueAndValidity({ emitEvent: false });
  }
}
