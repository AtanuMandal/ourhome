import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ServiceProviderService } from '../../core/services/service-provider.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-provider-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
            MatButtonModule, MatProgressBarModule, PageHeaderComponent],
  template: `
    <app-page-header title="Register Service Provider" [showBack]="true"></app-page-header>
    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <div class="page-content">
      <div class="card">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Provider / Company Name</mat-label>
            <input matInput formControlName="providerName">
            @if (form.get('providerName')?.invalid && form.get('providerName')?.touched) {
              <mat-error>Provider name is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Contact Person Name</mat-label>
            <input matInput formControlName="contactName">
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Phone</mat-label>
            <input matInput type="tel" formControlName="phone">
            @if (form.get('phone')?.invalid && form.get('phone')?.touched) {
              <mat-error>Phone is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email">
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Service Types</mat-label>
            <mat-select formControlName="serviceTypes" multiple>
              @for (t of allTypes; track t) { <mat-option [value]="t">{{ t }}</mat-option> }
            </mat-select>
            @if (form.get('serviceTypes')?.invalid && form.get('serviceTypes')?.touched) {
              <mat-error>Select at least one service type</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3"></textarea>
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit"
                  class="full-width" style="height:48px;margin-top:8px"
                  [disabled]="loading() || form.invalid">
            Register Provider
          </button>
        </form>
      </div>
    </div>
  `,
})
export class ProviderFormComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly svc    = inject(ServiceProviderService);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading  = signal(false);
  readonly allTypes = ['Plumber','Electrician','Carpenter','Painter','Cleaner','AC_Repair','Other'];

  readonly form = this.fb.group({
    providerName: ['', Validators.required],
    contactName:  [''],
    phone:        ['', Validators.required],
    email:        [''],
    serviceTypes: [[] as string[], Validators.required],
    description:  [''],
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.svc.register(this.form.value as any).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/services']); },
      error: () => this.loading.set(false),
    });
  }
}
