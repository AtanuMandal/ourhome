import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ShiftService } from '../../core/services/staff.service';
import { AuthService } from '../../core/services/auth.service';

/** "HH:mm:ss" (backend TimeSpan serialization) → "HH:mm" for an <input type="time">. */
function toTimeInputValue(value: string): string {
  return value.slice(0, 5);
}

/** "HH:mm" (from <input type="time">) → "HH:mm:ss" for the backend TimeSpan. */
function toApiTime(value: string): string {
  return `${value}:00`;
}

@Component({
  selector: 'app-shift-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressBarModule, PageHeaderComponent],
  template: `
    <app-page-header [title]="isEditMode() ? 'Edit Shift' : 'Add Shift'" [showBack]="true"></app-page-header>
    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <div class="page-content">
      <div class="card">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Shift Name</mat-label>
            <input matInput formControlName="name" placeholder="Morning Security">
            @if (form.controls.name.invalid && form.controls.name.touched) {
              <mat-error>Shift name is required</mat-error>
            }
          </mat-form-field>

          <div class="two-col">
            <mat-form-field appearance="fill">
              <mat-label>Start Time</mat-label>
              <input matInput type="time" formControlName="startTime">
            </mat-form-field>
            <mat-form-field appearance="fill">
              <mat-label>End Time</mat-label>
              <input matInput type="time" formControlName="endTime">
            </mat-form-field>
          </div>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Grace Period (minutes)</mat-label>
            <input matInput type="number" formControlName="graceMinutes" min="0">
            <mat-hint>Minutes after start time before a check-in counts as late</mat-hint>
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit"
                  class="full-width" style="height:48px;margin-top:8px"
                  [disabled]="saving() || form.invalid">
            {{ isEditMode() ? 'Save Changes' : 'Add Shift' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  `],
})
export class ShiftFormComponent implements OnInit {
  private readonly fb       = inject(FormBuilder).nonNullable;
  private readonly shiftSvc = inject(ShiftService);
  private readonly auth     = inject(AuthService);
  private readonly route    = inject(ActivatedRoute);
  private readonly router   = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly saving  = signal(false);
  readonly shiftId = signal<string | null>(null);

  readonly isEditMode = computed(() => this.shiftId() !== null);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    startTime: ['09:00', Validators.required],
    endTime: ['17:00', Validators.required],
    graceMinutes: [30, [Validators.required, Validators.min(0)]],
  });

  ngOnInit() {
    const sid = this.auth.societyId();
    const id = this.route.snapshot.paramMap.get('id');
    this.shiftId.set(id);

    if (!sid || !id) { this.loading.set(false); return; }

    this.shiftSvc.list(sid).subscribe({
      next: shifts => {
        const shift = shifts.find(s => s.id === id);
        if (shift) {
          this.form.patchValue({
            name: shift.name,
            startTime: toTimeInputValue(shift.startTime),
            endTime: toTimeInputValue(shift.endTime),
            graceMinutes: shift.graceMinutes,
          });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  submit() {
    if (this.form.invalid) return;
    const sid = this.auth.societyId();
    if (!sid) return;

    this.saving.set(true);
    const value = this.form.getRawValue();
    const dto = {
      name: value.name.trim(),
      startTime: toApiTime(value.startTime),
      endTime: toApiTime(value.endTime),
      graceMinutes: value.graceMinutes,
    };

    const request$ = this.isEditMode()
      ? this.shiftSvc.update(sid, this.shiftId()!, dto)
      : this.shiftSvc.create(sid, dto);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(this.isEditMode() ? 'Shift updated.' : 'Shift added.', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/staff/shifts']);
      },
      error: () => this.saving.set(false),
    });
  }
}
