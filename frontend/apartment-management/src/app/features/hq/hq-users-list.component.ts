import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { HqUserService } from '../../core/services/hq-user.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-hq-users-list',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule,
            PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header title="HQ Users" subtitle="Platform administrators and viewers"></app-page-header>
    <div class="page-content">
      @if (isHqAdmin()) {
        <div class="card">
          <div class="section-title">Add HQ User</div>
          <form [formGroup]="form" (ngSubmit)="create()" novalidate>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Full Name</mat-label>
              <input matInput formControlName="fullName">
            </mat-form-field>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email">
            </mat-form-field>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Phone</mat-label>
              <input matInput formControlName="phone">
            </mat-form-field>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Role</mat-label>
              <mat-select formControlName="role">
                <mat-option value="HQAdmin">HQ Admin</mat-option>
                <mat-option value="HQUser">HQ User</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit" class="full-width"
                    [disabled]="creating() || form.invalid">
              Create HQ User
            </button>
          </form>
        </div>
      }

      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else {
        @for (user of users(); track user.id) {
          <div class="card user-row">
            <div class="user-info">
              <div class="user-name">{{ user.fullName || user.name }}</div>
              <div class="user-meta">{{ user.email }} &middot; {{ user.role }}</div>
            </div>
            <span class="badge" [class.badge--active]="user.isActive" [class.badge--inactive]="!user.isActive">
              {{ user.isActive ? 'Active' : 'Inactive' }}
            </span>
            @if (isHqAdmin()) {
              @if (user.isActive) {
                <button mat-stroked-button color="warn" (click)="deactivate(user)">Disable</button>
              } @else {
                <button mat-stroked-button color="primary" (click)="activate(user)">Enable</button>
              }
            }
          </div>
        } @empty {
          <div class="card">No HQ users found.</div>
        }
      }
    </div>
  `,
  styles: [`
    .section-title { font-size:15px; font-weight:600; margin-bottom:12px; }
    .user-row { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
    .user-info { flex:1; min-width:180px; }
    .user-name { font-weight:600; }
    .user-meta { color:var(--text-secondary); font-size:13px; margin-top:2px; }
    .badge { padding:3px 10px; border-radius:999px; font-size:12px; font-weight:500; }
    .badge--active { background:#e8f5e9; color:#2e7d32; }
    .badge--inactive { background:#f3f4f6; color:#6b7280; }
    .full-width { width:100%; }
  `],
})
export class HqUsersListComponent implements OnInit {
  private readonly svc = inject(HqUserService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly users = signal<User[]>([]);
  readonly isHqAdmin = this.auth.isHqAdmin;

  readonly form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    role: ['HQUser' as 'HQAdmin' | 'HQUser', Validators.required],
  });

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.svc.list(1, 100).subscribe({
      next: res => {
        this.users.set(res.items ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  create() {
    if (this.form.invalid) return;
    this.creating.set(true);
    const value = this.form.getRawValue();
    this.svc.create({
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      role: value.role,
    }).subscribe({
      next: () => {
        this.creating.set(false);
        this.form.reset({ fullName: '', email: '', phone: '', role: 'HQUser' });
        this.snackBar.open('HQ user created.', 'Dismiss', { duration: 3000 });
        this.load();
      },
      error: () => this.creating.set(false),
    });
  }

  activate(user: User) {
    this.svc.activate(user.id).subscribe({
      next: () => {
        this.snackBar.open(`${user.fullName || user.email} enabled.`, 'Dismiss', { duration: 3000 });
        this.load();
      },
    });
  }

  deactivate(user: User) {
    this.svc.deactivate(user.id).subscribe({
      next: () => {
        this.snackBar.open(`${user.fullName || user.email} disabled.`, 'Dismiss', { duration: 3000 });
        this.load();
      },
    });
  }
}
