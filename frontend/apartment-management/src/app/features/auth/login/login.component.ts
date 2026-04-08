import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatSelectModule, MatProgressBarModule, MatIconModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error   = signal('');

  readonly form = this.fb.group({
    societyId: ['', Validators.required],
    email:     ['', [Validators.required, Validators.email]],
  });

  submit() {
    if (this.form.invalid) return;
    const { societyId, email } = this.form.value;
    this.loading.set(true);
    this.error.set('');

    this.auth.requestOtp(societyId!, email!).subscribe({
      next: res => {
        this.loading.set(false);
        this.router.navigate(['/auth/verify-otp'], {
          state: { userId: res.userId, societyId, email },
        });
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to send OTP. Please check your details.');
      },
    });
  }
}
