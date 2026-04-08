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
import { ServiceCategory } from '../../core/models/service-provider.model';

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
            <mat-label>Service Category</mat-label>
            <mat-select formControlName="category">
              @for (cat of categories; track cat) { <mat-option [value]="cat">{{ cat }}</mat-option> }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Title</mat-label>
            <input matInput formControlName="title" placeholder="e.g. Fix leaking pipe">
            @if (form.get('title')?.invalid && form.get('title')?.touched) {
              <mat-error>Title is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="4"
                      placeholder="Describe the issue..."></textarea>
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
  private readonly route  = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly categories: ServiceCategory[] = ['Plumber','Electrician','Carpenter','Painter','Cleaner','AC_Repair','Other'];

  readonly form = this.fb.group({
    category:    ['Plumber' as ServiceCategory, Validators.required],
    title:       ['', Validators.required],
    description: [''],
  });

  submit() {
    if (this.form.invalid) return;
    const sid  = this.auth.societyId()!;
    const user = this.auth.user()!;
    const pid  = this.route.snapshot.queryParamMap.get('providerId') ?? undefined;
    this.loading.set(true);
    this.svc.createRequest(sid, {
      ...this.form.value as any,
      apartmentId:       user.apartmentId ?? '',
      requestedBy:       user.id,
      serviceProviderId: pid,
    }).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/services']); },
      error: () => this.loading.set(false),
    });
  }
}
