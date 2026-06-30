import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

const PHONE_PATTERN = /^\d{10}$/;

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const pw  = control.get('password')?.value;
  const cpw = control.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressBarModule],
  template: `
    <div class="auth-container">
      @if (validating()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        <div class="status-text">Validating invite link…</div>
      } @else if (!tokenValid()) {
        <div class="card error-card">
          <h2>Invalid or Expired Link</h2>
          <p>This registration link is invalid or has expired. Please request a new one from your society admin.</p>
        </div>
      } @else {
        <div class="card">
          <h1>Create Your Account</h1>
          <p class="subtitle">You're joining your housing society. Fill in your details below.</p>

          @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Full Name</mat-label>
              <input matInput formControlName="fullName" autocomplete="name">
              @if (form.controls.fullName.invalid && form.controls.fullName.touched) {
                <mat-error>Full name is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email">
              @if (form.controls.email.invalid && form.controls.email.touched) {
                <mat-error>Valid email is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Phone (10 digits)</mat-label>
              <input matInput type="tel" formControlName="phone" autocomplete="tel">
              @if (form.controls.phone.invalid && form.controls.phone.touched) {
                <mat-error>10-digit phone number is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="new-password">
              @if (form.controls.password.invalid && form.controls.password.touched) {
                <mat-error>Password must be at least 8 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Confirm Password</mat-label>
              <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password">
              @if (form.controls.confirmPassword.touched && form.errors?.['passwordsMismatch']) {
                <mat-error>Passwords do not match</mat-error>
              }
              @if (form.controls.confirmPassword.invalid && form.controls.confirmPassword.touched && !form.errors?.['passwordsMismatch']) {
                <mat-error>Please confirm your password</mat-error>
              }
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit" class="full-width submit-btn"
                    [disabled]="loading() || form.invalid">
              Create Account
            </button>
          </form>
        </div>
      }
    </div>
  `,
  styles: [`
    .auth-container { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; background:#f5f5f5; }
    .card { width:100%; max-width:400px; background:white; border-radius:16px; padding:32px; box-shadow:0 2px 16px rgba(0,0,0,.08); }
    h1 { font-size:22px; margin:0 0 8px; }
    .subtitle { color:var(--text-secondary); font-size:14px; margin:0 0 24px; }
    .full-width { width:100%; }
    .submit-btn { height:48px; margin-top:8px; }
    .status-text { margin-top:24px; color:var(--text-secondary); font-size:14px; }
    .error-card { max-width:400px; text-align:center; h2 { color:var(--warn); } p { color:var(--text-secondary); font-size:14px; } }
  `],
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly validating = signal(true);
  readonly tokenValid = signal(false);
  readonly loading = signal(false);

  private inviteToken = '';
  private societyId = '';

  readonly form = this.fb.group({
    fullName:        ['', Validators.required],
    email:           ['', [Validators.required, Validators.email]],
    phone:           ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatchValidator });

  ngOnInit() {
    this.inviteToken = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.inviteToken) {
      this.validating.set(false);
      this.tokenValid.set(false);
      return;
    }

    this.auth.validateInviteToken(this.inviteToken).subscribe({
      next: res => {
        this.validating.set(false);
        this.tokenValid.set(res.valid);
        if (res.valid && res.societyId) {
          this.societyId = res.societyId;
        }
      },
      error: () => {
        this.validating.set(false);
        this.tokenValid.set(false);
      },
    });
  }

  submit() {
    if (this.form.invalid || !this.societyId) return;
    this.loading.set(true);
    const { fullName, email, phone, password } = this.form.getRawValue();

    this.auth.selfRegister(this.societyId, {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      inviteToken: this.inviteToken,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open('Account created! Please log in with your credentials.', 'OK', { duration: 6000 });
        this.router.navigate(['/auth/login']);
      },
      error: () => this.loading.set(false),
    });
  }
}
