import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { NoticeService } from '../../core/services/notice.service';
import { AuthService } from '../../core/services/auth.service';
import { NoticeCategory } from '../../core/models/notice.model';

@Component({
  selector: 'app-notice-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatProgressBarModule, PageHeaderComponent, SearchableSelectComponent],
  template: `
    <app-page-header [title]="isEditMode() ? 'Edit Notice' : 'Post Notice'" [showBack]="true"></app-page-header>
    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <div class="page-content">
      <div class="card">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (!isEditMode()) {
            <app-searchable-select label="Category" formControlName="category" [options]="categoryOptions"></app-searchable-select>
          }

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

          @if (!isEditMode()) {
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Publish At</mat-label>
              <input matInput type="datetime-local" formControlName="publishAt">
            </mat-form-field>
          }

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Expires At (optional)</mat-label>
            <input matInput type="datetime-local" formControlName="expiresAt">
          </mat-form-field>

          <button mat-raised-button color="primary" type="submit"
                  class="full-width" style="height:48px;margin-top:16px"
                  [disabled]="loading() || form.invalid">
            {{ isEditMode() ? 'Save Changes' : 'Post Notice' }}
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
  private readonly route  = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly categoryOptions = (['General','Maintenance','Event','Emergency','Financial','Bylaw'] as NoticeCategory[])
    .map(c => ({ value: c, label: c }));

  private readonly noticeId = this.route.snapshot.paramMap.get('id');
  readonly isEditMode = signal(!!this.noticeId);

  readonly form = this.fb.group({
    category:  ['General' as NoticeCategory, Validators.required],
    title:     ['', Validators.required],
    content:   ['', Validators.required],
    publishAt: [new Date().toISOString().slice(0, 16), Validators.required],
    expiresAt: [null as string | null],
  });

  constructor() {
    if (this.noticeId) {
      const sid = this.auth.societyId()!;
      this.loading.set(true);
      this.svc.get(sid, this.noticeId).subscribe({
        next: notice => {
          this.form.patchValue({
            category: notice.category,
            title: notice.title,
            content: notice.content,
            expiresAt: notice.expiresAt ? notice.expiresAt.slice(0, 16) : null,
          });
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  submit() {
    if (this.form.invalid) return;
    const sid = this.auth.societyId()!;
    const v   = this.form.value;
    this.loading.set(true);

    if (this.isEditMode()) {
      this.svc.update(sid, this.noticeId!, {
        title:     v.title!,
        content:   v.content!,
        expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : undefined,
      }).subscribe({
        next: () => { this.loading.set(false); this.router.navigate(['/notices', this.noticeId]); },
        error: () => this.loading.set(false),
      });
      return;
    }

    const user = this.auth.user()!;
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
