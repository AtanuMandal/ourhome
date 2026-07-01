import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { ComplaintService } from '../../core/services/complaint.service';
import { AuthService } from '../../core/services/auth.service';
import { ComplaintCategory, ComplaintPriority } from '../../core/models/complaint.model';

@Component({
  selector: 'app-complaint-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatProgressBarModule, PageHeaderComponent, SearchableSelectComponent],
  template: `
    <app-page-header title="Raise Complaint" [showBack]="true"></app-page-header>
    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <div class="page-content">
      <div class="card">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <app-searchable-select label="Category" formControlName="category" [options]="categoryOptions"></app-searchable-select>
          <app-searchable-select label="Priority" formControlName="priority" [options]="priorityOptions"></app-searchable-select>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Title</mat-label>
            <input matInput formControlName="title" placeholder="Brief title of issue">
            @if (form.get('title')?.invalid && form.get('title')?.touched) {
              <mat-error>Title is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="4"
                      placeholder="Describe the issue in detail..."></textarea>
            @if (form.get('description')?.invalid && form.get('description')?.touched) {
              <mat-error>Description is required</mat-error>
            }
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit"
                  class="full-width" style="height:48px;margin-top:8px"
                  [disabled]="loading() || form.invalid">
            Submit Complaint
          </button>
        </form>
      </div>
    </div>
  `,
})
export class ComplaintFormComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly svc    = inject(ComplaintService);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);

  readonly categoryOptions = (['Plumbing', 'Electrical', 'Cleaning', 'Security', 'Noise', 'Parking', 'Other'] as ComplaintCategory[])
    .map(c => ({ value: c, label: c }));
  readonly priorityOptions = (['Low', 'Medium', 'High', 'Critical'] as ComplaintPriority[])
    .map(p => ({ value: p, label: p }));

  readonly form = this.fb.group({
    category:    ['Plumbing' as ComplaintCategory, Validators.required],
    priority:    ['Medium' as ComplaintPriority, Validators.required],
    title:       ['', Validators.required],
    description: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid) return;
    const sid  = this.auth.societyId()!;
    const user = this.auth.user()!;
    this.loading.set(true);
    this.svc.raise(sid, {
      ...this.form.value as any,
      apartmentId: user.apartmentId ?? '',
      userId:      user.id,
    }).subscribe({
      next: c => { this.loading.set(false); this.router.navigate(['/complaints', c.id]); },
      error: () => this.loading.set(false),
    });
  }
}
