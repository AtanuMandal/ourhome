import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatProgressBarModule, MatIconModule,
  ],
  templateUrl: './verify-otp.component.html',
  styleUrl: './verify-otp.component.scss',
})
export class VerifyOtpComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading  = signal(false);
  readonly error    = signal('');
  readonly email    = signal('');
  private userId    = '';
  private societyId = '';

  readonly form = this.fb.group({
    otp: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(8)]],
  });

  ngOnInit() {
    const state = history.state;
    if (!state?.userId || !state?.societyId) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.userId    = state.userId;
    this.societyId = state.societyId;
    this.email.set(state.email ?? '');
  }

  submit() {
    if (this.form.invalid) return;
    const otp = this.form.value.otp!;
    this.loading.set(true);
    this.error.set('');

    this.auth.verifyOtp(this.societyId, this.userId, otp).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Invalid OTP. Please try again.');
      },
    });
  }

  back() { this.router.navigate(['/auth/login']); }
}
