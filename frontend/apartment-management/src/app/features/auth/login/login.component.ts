import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { LoginOption } from '../../../core/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatSelectModule, MatProgressBarModule, MatIconModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly options = signal<LoginOption[]>([]);

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
      error: () => {
        this.loading.set(false);
        this.error.set('Unable to sign in with that email and password.');
      },
    });
  }

  labelFor(option: LoginOption) {
    const apartment = option.apartmentLabel ?? option.apartmentId ?? 'No apartment';
    return `${option.societyName} - ${apartment} - ${option.residentType}`;
  }
}
