import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AmenityService } from '../../core/services/amenity.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatProgressBarModule, PageHeaderComponent],
  template: `
    <app-page-header title="Book Amenity" [showBack]="true"></app-page-header>
    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <div class="page-content">
      <div class="card">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Start Time</mat-label>
            <input matInput type="datetime-local" formControlName="startTime">
            @if (form.get('startTime')?.invalid && form.get('startTime')?.touched) {
              <mat-error>Start time is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>End Time</mat-label>
            <input matInput type="datetime-local" formControlName="endTime">
            @if (form.get('endTime')?.invalid && form.get('endTime')?.touched) {
              <mat-error>End time is required</mat-error>
            }
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit"
                  class="full-width" style="height:48px;margin-top:8px"
                  [disabled]="loading() || form.invalid">
            Confirm Booking
          </button>
        </form>
      </div>
    </div>
  `,
})
export class BookingFormComponent implements OnInit {
  private readonly svc    = inject(AmenityService);
  private readonly auth   = inject(AuthService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb     = inject(FormBuilder);

  readonly loading = signal(false);
  amenityId = '';

  readonly form = this.fb.group({
    startTime: ['', Validators.required],
    endTime:   ['', Validators.required],
  });

  ngOnInit() {
    this.amenityId = this.route.snapshot.paramMap.get('id')!;
  }

  submit() {
    if (this.form.invalid) return;
    const sid  = this.auth.societyId()!;
    const user = this.auth.user()!;
    const v    = this.form.value;
    this.loading.set(true);
    this.svc.book(sid, {
      amenityId:   this.amenityId,
      userId:      user.id,
      apartmentId: user.apartmentId ?? '',
      startTime:   new Date(v.startTime!).toISOString(),
      endTime:     new Date(v.endTime!).toISOString(),
    }).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/amenities']); },
      error: () => this.loading.set(false),
    });
  }
}
