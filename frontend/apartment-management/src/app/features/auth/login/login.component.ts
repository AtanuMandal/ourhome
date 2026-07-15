import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { LoginOption, LoginMethod } from '../../../core/models/user.model';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';

type PhoneStep = 'enter-phone' | 'select-account' | 'enter-otp';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatProgressBarModule, MatIconModule, SearchableSelectComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    // Apartment-invitation emails link here with the invitee's address prepopulated
    // (e.g. /auth/login?email=user@example.com) — switch to the email flow and prefill.
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) {
      this.method.set('email');
      this.auth.setLoginMethod('email');
      this.form.patchValue({ email });
    }
  }

  readonly loading = signal(false);
  readonly error = signal('');
  readonly options = signal<LoginOption[]>([]);
  readonly loginSelectOptions = computed(() =>
    this.options().map(o => ({ value: o.userId, label: this.labelFor(o) }))
  );

  // ── Login method (phone+OTP is the default) ──────────────────────────────
  readonly method = signal<LoginMethod>(this.auth.getLoginMethod());

  switchMethod(method: LoginMethod) {
    this.method.set(method);
    this.auth.setLoginMethod(method);
    this.error.set('');
    this.options.set([]);
    this.phoneStep.set('enter-phone');
  }

  // ── Email + password flow ─────────────────────────────────────────────────
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    selectedUserId: [''],
  });

  submit() {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.loading.set(true);
    this.error.set('');

    this.auth.login(value.email, value.password, value.selectedUserId || undefined).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.requiresSelection) {
          this.options.set(res.options);
          if (!value.selectedUserId && res.options.length) {
            this.form.patchValue({ selectedUserId: res.options[0].userId });
          }
          return;
        }

        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(this.messageFor(err, 'Unable to sign in with that email and password.'));
      },
    });
  }

  // ── Phone + OTP flow ───────────────────────────────────────────────────────
  readonly phoneStep = signal<PhoneStep>('enter-phone');
  private otpSocietyId = '';
  private otpUserId = '';

  readonly phoneForm = this.fb.nonNullable.group({
    phone: ['', [Validators.required, Validators.minLength(10)]],
    selectedUserId: [''],
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  requestPhoneOtp() {
    const phoneCtrl = this.phoneForm.get('phone');
    if (phoneCtrl?.invalid) { phoneCtrl.markAsTouched(); return; }
    const value = this.phoneForm.getRawValue();
    this.loading.set(true);
    this.error.set('');

    this.auth.requestOtpLogin(value.phone, value.selectedUserId || undefined).subscribe({
      next: res => {
        this.loading.set(false);
        if (res.requiresSelection) {
          this.options.set(res.options);
          if (res.options.length) {
            this.phoneForm.patchValue({ selectedUserId: res.options[0].userId });
          }
          this.phoneStep.set('select-account');
          return;
        }

        this.otpUserId = res.userId!;
        this.otpSocietyId = res.options[0]?.societyId ?? '';
        this.phoneStep.set('enter-otp');
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(this.messageFor(err, 'Unable to find an account with that mobile number.'));
      },
    });
  }

  confirmAccountSelection() {
    // Re-submit with the chosen account so the OTP is generated and sent to that specific user.
    this.requestPhoneOtp();
  }

  verifyPhoneOtp() {
    const otpCtrl = this.phoneForm.get('otp');
    if (otpCtrl?.invalid) { otpCtrl.markAsTouched(); return; }
    const otp = this.phoneForm.getRawValue().otp;
    this.loading.set(true);
    this.error.set('');

    this.auth.verifyOtpLogin(this.otpSocietyId, this.otpUserId, otp).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(this.messageFor(err, 'That OTP is invalid or has expired.'));
      },
    });
  }

  labelFor(option: LoginOption) {
    const apartment = option.apartmentLabel ?? option.apartmentId ?? 'No apartment';
    return `${option.societyName} - ${apartment} - ${option.residentType}`;
  }

  private messageFor(err: HttpErrorResponse, fallback: string): string {
    if (err.error?.errorCode === 'SOCIETY_NOT_ACTIVE') {
      return 'Your society has been disabled by the platform administrator. Please contact your housing society for assistance.';
    }
    return fallback;
  }
}
