import { Component, inject, signal } from '@angular/core';
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
            @if (form.get('fullName')?.invalid && form.get('fullName')?.touched) {
              <mat-error>Full name is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email">
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <mat-error>Valid email is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Phone</mat-label>
            <input matInput type="tel" formControlName="phone">
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
            <mat-label>Apartment ID (optional)</mat-label>
            <input matInput formControlName="apartmentId" placeholder="Leave blank if not assigned">
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
  private readonly fb     = inject(FormBuilder);
  private readonly svc    = inject(UserService);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);

  readonly form = this.fb.group({
    fullName:    ['', Validators.required],
    email:       ['', [Validators.required, Validators.email]],
    phone:       [''],
    role:        ['SUUser', Validators.required],
    residentType:['Owner', Validators.required],
    apartmentId: [''],
  });

  submit() {
    if (this.form.invalid) return;
    const sid = this.auth.societyId()!;
    const v   = this.form.value;
    this.loading.set(true);
    this.svc.register(sid, {
      fullName:    v.fullName!,
       email:       v.email!,
       phone:       v.phone ?? '',
       role:        v.role!,
       residentType:v.residentType!,
       apartmentId: v.apartmentId || undefined,
     }).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/residents']); },
      error: () => this.loading.set(false),
    });
  }
}
