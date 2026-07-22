import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { UserAvatarComponent } from '../../shared/components/user-avatar/user-avatar.component';
import { AvatarCropDialogComponent } from '../../shared/components/avatar-crop-dialog/avatar-crop-dialog.component';
import { UserService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';

const PHONE_PATTERN = /^\d{10}$/;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressBarModule, MatDividerModule,
    PageHeaderComponent, UserAvatarComponent,
  ],
  template: `
    <app-page-header title="My Profile" [showBack]="false"></app-page-header>
    @if (saving()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

    <div class="page-content">
      <div class="profile-header">
        <div class="avatar-upload">
          <app-user-avatar [name]="auth.user()?.fn ?? auth.user()?.nm ?? ''"
            [pictureUrl]="auth.user()?.pic" class="avatar-xl-host"></app-user-avatar>
          <button mat-mini-fab color="primary" class="avatar-upload__btn" type="button"
                  aria-label="Change profile picture" (click)="pictureInput.click()">
            <mat-icon>photo_camera</mat-icon>
          </button>
          <input #pictureInput type="file" accept="image/*" hidden (change)="onPictureSelected($event)">
        </div>
        <h2>{{ auth.user()?.nm }}</h2>
        <span class="role-chip">{{ auth.user()?.rl }}</span>
        <p class="email">{{ auth.user()?.em }}</p>
      </div>

      <div class="card">
        <div class="section-title">Update Info</div>
        <form [formGroup]="infoForm" (ngSubmit)="saveInfo()" novalidate>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Full Name</mat-label>
            <input matInput formControlName="fullName">
            @if (infoForm.controls.fullName.invalid && infoForm.controls.fullName.touched) {
              <mat-error>Full name is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Phone</mat-label>
            <input matInput type="tel" formControlName="phone">
            @if (infoForm.controls.phone.invalid && infoForm.controls.phone.touched) {
              <mat-error>Phone must be exactly 10 digits</mat-error>
            }
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit"
                  [disabled]="saving() || infoForm.invalid || infoForm.pristine">
            Save Changes
          </button>
        </form>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="section-title">Change Password</div>
        @if (!auth.user()?.vf) {
          <p style="color:var(--text-secondary);font-size:13px;">
            Set your password using the OTP you received via SMS during registration.
            Use Forgot Password on the login screen.
          </p>
        } @else {
          <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" novalidate>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Current Password</mat-label>
              <input matInput type="password" formControlName="currentPassword">
              @if (passwordForm.controls.currentPassword.invalid && passwordForm.controls.currentPassword.touched) {
                <mat-error>Current password is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>New Password</mat-label>
              <input matInput type="password" formControlName="newPassword">
              @if (passwordForm.controls.newPassword.invalid && passwordForm.controls.newPassword.touched) {
                <mat-error>Password must be at least 8 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Confirm New Password</mat-label>
              <input matInput type="password" formControlName="confirmPassword">
              @if (passwordForm.controls.confirmPassword.touched && passwordForm.hasError('passwordMismatch')) {
                <mat-error>Passwords do not match</mat-error>
              }
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit"
                    [disabled]="saving() || passwordForm.invalid || passwordForm.pristine">
              Change Password
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .profile-header {
      text-align: center; padding: 32px 16px 16px;
      .avatar-upload {
        position: relative; width: 80px; margin: 0 auto 12px;
      }
      .avatar-xl-host { --avatar-size: 80px; display: block; }
      .avatar-upload__btn {
        position: absolute; right: -10px; bottom: -6px;
        transform: scale(.72); transform-origin: bottom right;
      }
      h2 { font-size: 20px; margin: 0 0 4px; }
      .email { color: var(--text-secondary); font-size: 13px; margin: 4px 0 0; }
    }
    .role-chip {
      font-size: 12px; background: rgba(25,118,210,.1); color: var(--primary-light);
      padding: 3px 10px; border-radius: 999px; font-weight: 500;
    }
    .section-title { font-size: 15px; font-weight: 600; margin-bottom: 16px; }
  `],
})
export class ProfileComponent implements OnInit {
  private readonly fb      = inject(FormBuilder).nonNullable;
  private readonly userSvc = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog  = inject(MatDialog);
  readonly auth = inject(AuthService);

  readonly saving = signal(false);

  readonly infoForm = this.fb.group({
    fullName: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
  });

  readonly passwordForm = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: confirmPasswordMatch }
  );

  initials() {
    return (this.auth.user()?.nm ?? '')
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  ngOnInit() {
    const u = this.auth.user();
    if (u) {
      this.infoForm.patchValue({ fullName: u.nm, phone: u.ph ?? '' });
    }
  }

  onPictureSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file later
    if (!file) return;

    this.dialog.open(AvatarCropDialogComponent, { data: { file }, width: '340px' })
      .afterClosed().subscribe((blob: Blob | undefined) => {
        if (!blob) return;
        const sid = this.auth.societyId();
        const uid = this.auth.user()?.id;
        if (!sid || !uid) return;

        this.saving.set(true);
        this.userSvc.uploadProfilePicture(sid, uid, blob).subscribe({
          next: res => {
            this.saving.set(false);
            this.auth.updateUser({ pic: res.pic });
            this.snackBar.open('Profile picture updated.', 'Dismiss', { duration: 3000 });
          },
          error: () => {
            this.saving.set(false);
            this.snackBar.open('Unable to upload the picture. Try again.', 'Dismiss', { duration: 4000 });
          },
        });
      });
  }

  saveInfo() {
    if (this.infoForm.invalid) return;
    const sid = this.auth.societyId();
    const uid = this.auth.user()?.id;
    if (!sid || !uid) return;

    this.saving.set(true);
    const { fullName, phone } = this.infoForm.getRawValue();
    this.userSvc.update(sid, uid, { fullName, phone }).subscribe({
      next: () => {
        this.saving.set(false);
        this.infoForm.markAsPristine();
        this.snackBar.open('Profile updated.', 'Dismiss', { duration: 3000 });
      },
      error: () => this.saving.set(false),
    });
  }

  changePassword() {
    if (this.passwordForm.invalid) return;
    const sid = this.auth.societyId();
    const uid = this.auth.user()?.id;
    if (!sid || !uid) return;

    this.saving.set(true);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.userSvc.changePassword(sid, uid, { currentPassword, newPassword }).subscribe({
      next: () => {
        this.saving.set(false);
        this.passwordForm.reset();
        this.snackBar.open('Password changed successfully.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.saving.set(false),
    });
  }
}

function confirmPasswordMatch(group: import('@angular/forms').AbstractControl) {
  const pw  = group.get('newPassword')?.value;
  const cpw = group.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { passwordMismatch: true } : null;
}
