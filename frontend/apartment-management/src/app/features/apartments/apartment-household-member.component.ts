import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { UserService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';

const PHONE_PATTERN = /^\d{10}$/;

@Component({
  selector: 'app-apartment-household-member',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, MatSelectModule, PageHeaderComponent],
  template: `
    <app-page-header title="Add Family Member / Co-Occupant" [showBack]="true"></app-page-header>
    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <div class="page-content">
      <div class="card">
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Full name</mat-label>
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
            <input matInput formControlName="phone">
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
            <mat-label>Resident type</mat-label>
            <mat-select formControlName="residentType">
              @for (residentType of residentTypes(); track residentType.value) {
                <mat-option [value]="residentType.value">{{ residentType.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit" [disabled]="loading() || form.invalid">
            Add Household Member
          </button>
        </form>
      </div>
    </div>
  `,
})
export class ApartmentHouseholdMemberComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly residentTypes = signal<Array<{ value: 'FamilyMember' | 'CoOccupant'; label: string }>>([]);

  readonly form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    residentType: ['FamilyMember' as 'FamilyMember' | 'CoOccupant', Validators.required],
  });

  ngOnInit() {
    const user = this.auth.user();
    if (!user || user.role !== 'SUUser' || (user.residentType !== 'Owner' && user.residentType !== 'Tenant')) {
      this.router.navigate(['/apartments', this.route.snapshot.paramMap.get('id')]);
      return;
    }

    const options = user.residentType === 'Owner'
      ? [{ value: 'FamilyMember' as const, label: 'Family Member' }]
      : [{ value: 'CoOccupant' as const, label: 'Co-Occupant' }];

    this.residentTypes.set(options);
    this.form.controls.residentType.setValue(options[0].value);
  }

  submit() {
    if (this.form.invalid) return;
    const sid = this.auth.societyId();
    const id = this.route.snapshot.paramMap.get('id');
    if (!sid || !id) return;

    this.loading.set(true);
    this.userService.addHouseholdMember(sid, id, this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/apartments', id]);
      },
      error: () => this.loading.set(false),
    });
  }
}
