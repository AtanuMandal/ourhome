import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SocietyService } from '../../core/services/society.service';

@Component({
  selector: 'app-hq-society-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatDividerModule, PageHeaderComponent],
  template: `
    <app-page-header title="Add Society" [showBack]="true"></app-page-header>
    <div class="page-content">
      <div class="card">
        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Society Name</mat-label>
            <input matInput formControlName="name">
          </mat-form-field>

          <div class="section-title">Address</div>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Street</mat-label>
            <input matInput formControlName="street">
          </mat-form-field>
          <div class="two-col">
            <mat-form-field appearance="fill">
              <mat-label>City</mat-label>
              <input matInput formControlName="city">
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>State</mat-label>
              <input matInput formControlName="state">
            </mat-form-field>
          </div>
          <div class="two-col">
            <mat-form-field appearance="fill">
              <mat-label>Postal Code</mat-label>
              <input matInput formControlName="postalCode">
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>Country</mat-label>
              <input matInput formControlName="country">
            </mat-form-field>
          </div>

          <mat-divider style="margin:16px 0"></mat-divider>
          <div class="section-title">Contact &amp; Size</div>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Contact Email</mat-label>
            <input matInput formControlName="contactEmail" type="email">
          </mat-form-field>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Contact Phone</mat-label>
            <input matInput formControlName="contactPhone">
          </mat-form-field>
          <div class="two-col">
            <mat-form-field appearance="fill">
              <mat-label>Total Blocks</mat-label>
              <input matInput type="number" formControlName="totalBlocks" min="1">
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>Total Apartments</mat-label>
              <input matInput type="number" formControlName="totalApartments" min="1">
            </mat-form-field>
          </div>

          <mat-divider style="margin:16px 0"></mat-divider>
          <div class="section-title">First Society Admin</div>
          <div class="section-copy">This account is created together with the society and can sign in immediately after OTP verification.</div>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Admin Full Name</mat-label>
            <input matInput formControlName="adminFullName">
          </mat-form-field>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Admin Email</mat-label>
            <input matInput formControlName="adminEmail" type="email">
          </mat-form-field>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Admin Phone</mat-label>
            <input matInput formControlName="adminPhone">
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit"
                  class="full-width primary-action" [disabled]="saving() || form.invalid">
            Create Society
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .full-width { width:100%; }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .section-title { font-size:15px; font-weight:600; margin:8px 0 4px; }
    .section-copy { color:var(--text-secondary); font-size:13px; margin-bottom:12px; }
    .primary-action { margin-top:16px; height:48px; }
  `],
})
export class HqSocietyFormComponent {
  private readonly svc = inject(SocietyService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly snackBar = inject(MatSnackBar);

  readonly saving = signal(false);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    street: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', Validators.required],
    postalCode: ['', Validators.required],
    country: ['India', Validators.required],
    contactEmail: ['', [Validators.required, Validators.email]],
    contactPhone: ['', Validators.required],
    totalBlocks: [1, [Validators.required, Validators.min(1)]],
    totalApartments: [1, [Validators.required, Validators.min(1)]],
    adminFullName: ['', Validators.required],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminPhone: ['', Validators.required],
  });

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const value = this.form.getRawValue();

    this.svc.create({
      name: value.name.trim(),
      street: value.street.trim(),
      city: value.city.trim(),
      state: value.state.trim(),
      postalCode: value.postalCode.trim(),
      country: value.country.trim(),
      contactEmail: value.contactEmail.trim(),
      contactPhone: value.contactPhone.trim(),
      totalBlocks: value.totalBlocks,
      totalApartments: value.totalApartments,
      adminFullName: value.adminFullName.trim(),
      adminEmail: value.adminEmail.trim(),
      adminPhone: value.adminPhone.trim(),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Society created.', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/hq/societies']);
      },
      error: () => this.saving.set(false),
    });
  }
}
