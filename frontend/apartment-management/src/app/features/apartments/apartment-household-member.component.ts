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
          </mat-form-field>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email">
          </mat-form-field>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Phone</mat-label>
            <input matInput formControlName="phone">
          </mat-form-field>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Resident type</mat-label>
            <mat-select formControlName="residentType">
              <mat-option value="FamilyMember">Family Member</mat-option>
              <mat-option value="CoOccupant">Co-Occupant</mat-option>
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

  readonly form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    residentType: ['FamilyMember' as 'FamilyMember' | 'CoOccupant', Validators.required],
  });

  ngOnInit() {
    if (!this.auth.isAdmin()) {
      this.router.navigate(['/apartments', this.route.snapshot.paramMap.get('id')]);
    }
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
