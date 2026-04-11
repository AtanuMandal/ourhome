import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ApartmentService, UserService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-apartment-transfer-resident',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, PageHeaderComponent],
  template: `
    <app-page-header [title]="title()" [showBack]="true"></app-page-header>
    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <div class="page-content">
      <div class="card">
        <p class="helper-copy">{{ description() }}</p>
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
          <button mat-raised-button color="primary" type="submit" [disabled]="loading() || form.invalid">
            {{ submitLabel() }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`.helper-copy { color: var(--text-secondary); margin: 0 0 16px; }`],
})
export class ApartmentTransferResidentComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly userService = inject(UserService);
  private readonly apartmentService = inject(ApartmentService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly apartmentNumber = signal('');
  readonly action = signal<'owner' | 'tenant'>('tenant');
  readonly title = computed(() => this.action() === 'owner' ? 'Transfer Owner' : 'Add / Transfer Tenant');
  readonly description = computed(() => this.action() === 'owner'
    ? `Create the new owner account for apartment ${this.apartmentNumber() || this.route.snapshot.paramMap.get('id')}.`
    : `Create the new tenant account for apartment ${this.apartmentNumber() || this.route.snapshot.paramMap.get('id')}.`);
  readonly submitLabel = computed(() => this.action() === 'owner' ? 'Transfer Owner' : 'Save Tenant');

  readonly form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
  });

  ngOnInit() {
    if (!this.auth.isAdmin()) {
      this.router.navigate(['/apartments', this.route.snapshot.paramMap.get('id')]);
      return;
    }

    this.action.set((this.route.snapshot.data['action'] as 'owner' | 'tenant') ?? 'tenant');
    const sid = this.auth.societyId();
    const id = this.route.snapshot.paramMap.get('id');
    if (!sid || !id) return;
    this.apartmentService.get(sid, id).subscribe({
      next: apartment => this.apartmentNumber.set(apartment.apartmentNumber),
    });
  }

  submit() {
    if (this.form.invalid) return;
    const sid = this.auth.societyId();
    const id = this.route.snapshot.paramMap.get('id');
    if (!sid || !id) return;

    const payload = this.form.getRawValue();
    const request = this.action() === 'owner'
      ? this.userService.transferOwnership(sid, id, payload)
      : this.userService.transferTenancy(sid, id, payload);

    this.loading.set(true);
    request.subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/apartments', id]);
      },
      error: () => this.loading.set(false),
    });
  }
}
