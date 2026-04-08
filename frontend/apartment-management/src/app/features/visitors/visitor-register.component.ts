import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { VisitorService } from '../../core/services/visitor.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-visitor-register',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatProgressBarModule, PageHeaderComponent],
  template: `
    <app-page-header title="Register Visitor" [showBack]="true"></app-page-header>
    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <div class="page-content">
      <div class="card">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Visitor Name</mat-label>
            <input matInput formControlName="visitorName">
            @if (form.get('visitorName')?.invalid && form.get('visitorName')?.touched) {
              <mat-error>Name is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Phone</mat-label>
            <input matInput type="tel" formControlName="Phone">
            @if (form.get('Phone')?.invalid && form.get('Phone')?.touched) {
              <mat-error>Phone is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Email (optional)</mat-label>
            <input matInput type="email" formControlName="Email">
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Purpose of Visit</mat-label>
            <input matInput formControlName="purpose">
            @if (form.get('purpose')?.invalid && form.get('purpose')?.touched) {
              <mat-error>Purpose is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Vehicle Number (optional)</mat-label>
            <input matInput formControlName="vehicleNumber">
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit"
                  class="full-width" style="height:48px;margin-top:8px"
                  [disabled]="loading() || form.invalid">
            Register &amp; Generate Pass
          </button>
        </form>
      </div>
    </div>
  `,
})
export class VisitorRegisterComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly svc    = inject(VisitorService);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);

  readonly form = this.fb.group({
    visitorName:   ['', Validators.required],
    Phone:  ['', Validators.required],
    Email:  [''],
    purpose:       ['', Validators.required],
    vehicleNumber: [''],
  });

  submit() {
    if (this.form.invalid) return;
    const sid  = this.auth.societyId()!;
    const user = this.auth.user()!;
    this.loading.set(true);
    this.svc.register(sid, {
      ...this.form.value as any,
      hostUserId:      user.id,
      hostApartmentId: user.apartmentId ?? ''
    }).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/visitors']); },
      error: () => this.loading.set(false),
    });
  }
}
