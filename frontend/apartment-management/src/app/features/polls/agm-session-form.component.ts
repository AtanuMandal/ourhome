import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AgmSessionService } from '../../core/services/agm-session.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-agm-session-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, PageHeaderComponent],
  template: `
    <app-page-header title="New AGM Session" [showBack]="true"></app-page-header>
    <div class="page-content">
      <div class="card">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Title</mat-label>
            <input matInput formControlName="title">
            @if (form.controls.title.invalid && form.controls.title.touched) {
              <mat-error>Title is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Description</mat-label>
            <textarea matInput rows="3" formControlName="description"></textarea>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Session Date</mat-label>
            <input matInput type="datetime-local" formControlName="sessionDate">
            @if (form.controls.sessionDate.invalid && form.controls.sessionDate.touched) {
              <mat-error>Session date is required</mat-error>
            }
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit"
                  class="full-width" style="height:48px;margin-top:16px"
                  [disabled]="saving() || form.invalid">
            Create Session
          </button>
        </form>
      </div>
    </div>
  `,
})
export class AgmSessionFormComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly agmSessionSvc = inject(AgmSessionService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly saving = signal(false);

  readonly form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    sessionDate: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid) return;
    const sid = this.auth.societyId();
    if (!sid) return;

    this.saving.set(true);
    const value = this.form.getRawValue();

    this.agmSessionSvc.create(sid, {
      title: value.title.trim(),
      description: value.description.trim(),
      sessionDate: new Date(value.sessionDate).toISOString(),
    }).subscribe({
      next: session => {
        this.saving.set(false);
        this.snackBar.open('AGM session created.', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/agm-sessions', session.id]);
      },
      error: () => this.saving.set(false),
    });
  }
}
