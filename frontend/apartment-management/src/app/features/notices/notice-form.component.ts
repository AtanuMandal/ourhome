import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { NoticeService } from '../../core/services/notice.service';
import { AuthService } from '../../core/services/auth.service';
import { NoticeCategory } from '../../core/models/notice.model';

@Component({
  selector: 'app-notice-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
            MatButtonModule, MatProgressBarModule, PageHeaderComponent],
  template: `
    <app-page-header title="Post Notice" [showBack]="true"></app-page-header>
    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <div class="page-content">
      <div class="card">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Category</mat-label>
            <mat-select formControlName="category">
              @for (cat of categories; track cat) { <mat-option [value]="cat">{{ cat }}</mat-option> }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Title</mat-label>
            <input matInput formControlName="title" placeholder="Notice title">
            @if (form.get('title')?.invalid && form.get('title')?.touched) {
              <mat-error>Title is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Content</mat-label>
            <textarea matInput formControlName="content" rows="6" placeholder="Notice content..."></textarea>
            @if (form.get('content')?.invalid && form.get('content')?.touched) {
              <mat-error>Content is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Publish At</mat-label>
            <input matInput type="datetime-local" formControlName="publishAt">
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Expires At (optional)</mat-label>
            <input matInput type="datetime-local" formControlName="expiresAt">
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit"
                  class="full-width" style="height:48px;margin-top:16px"
                  [disabled]="loading() || form.invalid">
            Post Notice
          </button>
        </form>
      </div>
    </div>
  `,
})
export class NoticeFormComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly svc    = inject(NoticeService);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly categories: NoticeCategory[] = ['General','Maintenance','Event','Emergency','Financial','Bylaw'];

  readonly form = this.fb.group({
    category:  ['General' as NoticeCategory, Validators.required],
    title:     ['', Validators.required],
    content:   ['', Validators.required],
    publishAt: [new Date().toISOString().slice(0, 16), Validators.required],
    expiresAt: [null as string | null],
  });

  submit() {
    if (this.form.invalid) return;
    const sid  = this.auth.societyId()!;
    const user = this.auth.user()!;
    const v    = this.form.value;
    this.loading.set(true);
    this.svc.post(sid, {
      userId:    user.id,
      title:     v.title!,
      content:   v.content!,
      category:  v.category!,
      publishAt: new Date(v.publishAt!).toISOString(),
      expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : undefined,
    }).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/notices']); },
      error: () => this.loading.set(false),
    });
  }
}
