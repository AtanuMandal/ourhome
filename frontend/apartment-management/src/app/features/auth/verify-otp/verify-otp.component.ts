import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { LoginOption } from '../../../core/models/user.model';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatProgressBarModule, MatIconModule, SearchableSelectComponent,
  ],
  templateUrl: './verify-otp.component.html',
  styleUrl: './verify-otp.component.scss',
})
export class VerifyOtpComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly requested = signal(false);
  readonly options = signal<LoginOption[]>([]);
  readonly selected = signal<LoginOption | null>(null);
  readonly loginSelectOptions = computed(() =>
    this.options().map(o => ({ value: o.uid, label: this.labelFor(o) }))
  );

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    selectedUserId: [''],
    otp: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(8)]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  requestReset() {
    if (this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      return;
    }

    const { email, selectedUserId } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set('');

    this.auth.requestPasswordReset(email, selectedUserId || undefined).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.rs) {
          this.options.set(res.opts);
          if (res.opts.length) {
            this.form.patchValue({ selectedUserId: res.opts[0].uid });
          }
          return;
        }

        this.options.set(res.opts);
        const selected = res.opts.find(option => option.uid === (selectedUserId || res.uid))
          ?? null;
        this.selected.set(selected);
        this.requested.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Unable to start password reset for that email.');
      },
    });
  }

  submit() {
    if (this.form.controls.otp.invalid || this.form.controls.newPassword.invalid) {
      this.form.controls.otp.markAsTouched();
      this.form.controls.newPassword.markAsTouched();
      return;
    }

    const option = this.selected()
      ?? this.options().find(item => item.uid === this.form.getRawValue().selectedUserId);
    if (!option) {
      this.error.set('Please choose the account you want to reset.');
      return;
    }

    const { otp, newPassword } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set('');

    this.auth.confirmPasswordReset(option.sid, option.uid, otp, newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('The OTP is invalid or the password reset could not be completed.');
      },
    });
  }

  selectAccount() {
    const option = this.options().find(item => item.uid === this.form.getRawValue().selectedUserId) ?? null;
    this.selected.set(option);
    if (option) {
      this.requestReset();
    }
  }

  labelFor(option: LoginOption) {
    const apartment = option.alb ?? option.aid ?? 'No apartment';
    return `${option.snm} - ${apartment} - ${option.rt}`;
  }

  back() {
    this.router.navigate(['/auth/login']);
  }
}
