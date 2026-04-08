import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ServiceProviderService } from '../../core/services/service-provider.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
            MatButtonModule, MatProgressBarModule, PageHeaderComponent],
  template: `
    <app-page-header title="Service Request" [showBack]="true"></app-page-header>
    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <div class="page-content">
      <div class="card">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Service Type</mat-label>
            <mat-select formControlName="serviceType">
              @for (t of serviceTypes; track t) { <mat-option [value]="t">{{ t }}</mat-option> }
            </mat-select>
            @if (form.get('serviceType')?.invalid && form.get('serviceType')?.touched) {
              <mat-error>Service type is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="4"
                      placeholder="Describe the issue..."></textarea>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Preferred Date &amp; Time</mat-label>
            <input matInput type="datetime-local" formControlName="preferredDateTime">
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit"
                  class="full-width" style="height:48px;margin-top:8px"
                  [disabled]="loading() || form.invalid">
            Submit Request
          </button>
        </form>
      </div>
    </div>
  `,
})
export class RequestFormComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly svc    = inject(ServiceProviderService);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly serviceTypes = ['Plumber','Electrician','Carpenter','Painter','Cleaner','AC_Repair','Other'];

  readonly form = this.fb.group({
    serviceType:       ['Plumber', Validators.required],
    description:       [''],
    preferredDateTime: [''],
  });

  submit() {
    if (this.form.invalid) return;
    const sid  = this.auth.societyId()!;
    const user = this.auth.user()!;
    const v    = this.form.value;
    this.loading.set(true);
    this.svc.createRequest(sid, {
      apartmentId:       user.apartmentId ?? '',
      userId:            user.id,
      serviceType:       v.serviceType!,
      description:       v.description ?? '',
      preferredDateTime: v.preferredDateTime ? new Date(v.preferredDateTime).toISOString() : new Date().toISOString(),
    }).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/services']); },
      error: () => this.loading.set(false),
    });
  }
}
