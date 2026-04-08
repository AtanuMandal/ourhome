import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AmenityService } from '../../core/services/amenity.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-amenity-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatProgressBarModule, PageHeaderComponent],
  template: `
    <app-page-header title="Add Amenity" [showBack]="true"></app-page-header>
    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <div class="page-content">
      <div class="card">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" placeholder="e.g. Swimming Pool">
            @if (form.get('name')?.invalid && form.get('name')?.touched) {
              <mat-error>Name is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3"></textarea>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Capacity (persons)</mat-label>
            <input matInput type="number" formControlName="capacity">
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Rules</mat-label>
            <textarea matInput formControlName="rules" rows="2"></textarea>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Booking Slot Duration (minutes)</mat-label>
            <input matInput type="number" formControlName="bookingSlotMinutes">
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Operating Start (HH:mm)</mat-label>
            <input matInput type="time" formControlName="operatingStart">
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Operating End (HH:mm)</mat-label>
            <input matInput type="time" formControlName="operatingEnd">
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Advance Booking Days</mat-label>
            <input matInput type="number" formControlName="advanceBookingDays">
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit"
                  class="full-width" style="height:48px;margin-top:8px"
                  [disabled]="loading() || form.invalid">
            Create Amenity
          </button>
        </form>
      </div>
    </div>
  `,
})
export class AmenityFormComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly svc    = inject(AmenityService);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);

  readonly form = this.fb.group({
    name:               ['', Validators.required],
    description:        [''],
    capacity:           [10, Validators.required],
    rules:              [''],
    bookingSlotMinutes: [60, Validators.required],
    operatingStart:     ['06:00', Validators.required],
    operatingEnd:       ['22:00', Validators.required],
    advanceBookingDays: [7],
  });

  submit() {
    if (this.form.invalid) return;
    const sid = this.auth.societyId()!;
    this.loading.set(true);
    this.svc.create(sid, this.form.value as any).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/amenities']); },
      error: () => this.loading.set(false),
    });
  }
}
