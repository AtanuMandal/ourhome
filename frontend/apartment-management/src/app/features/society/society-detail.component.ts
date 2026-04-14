import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { SocietyService } from '../../core/services/society.service';
import { AuthService } from '../../core/services/auth.service';
import { Society } from '../../core/models/society.model';

@Component({
  selector: 'app-society-detail',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatProgressBarModule, MatDividerModule,
            PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header title="Society Details"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (!editing()) {
        <div class="card">
          <div class="society-brand">
            <div class="soc-icon"><span class="material-icons">location_city</span></div>
            <h2>{{ society()?.name }}</h2>
          </div>
          <mat-divider style="margin:16px 0"></mat-divider>
          <div class="detail-row"><span class="label">Address</span><span>{{ society()?.address?.street }}</span></div>
          <div class="detail-row"><span class="label">City</span><span>{{ society()?.address?.city }}, {{ society()?.address?.state }}</span></div>
          <div class="detail-row"><span class="label">PIN</span><span>{{ society()?.address?.postalCode }}</span></div>
          <div class="detail-row"><span class="label">Country</span><span>{{ society()?.address?.country }}</span></div>
          <div class="detail-row"><span class="label">Apartments</span><span>{{ society()?.totalApartments }}</span></div>
          @if (society()?.contactEmail) {
            <div class="detail-row"><span class="label">Email</span><span>{{ society()?.contactEmail }}</span></div>
          }
          @if (society()?.contactPhone) {
            <div class="detail-row"><span class="label">Phone</span><span>{{ society()?.contactPhone }}</span></div>
          }
          <button mat-raised-button color="primary" style="margin-top:16px;width:100%;height:48px" (click)="editing.set(true)">
            Edit Society
          </button>
        </div>
      } @else {
        <div class="card">
          <form [formGroup]="form" (ngSubmit)="save()" novalidate>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Society Name</mat-label>
              <input matInput formControlName="name">
            </mat-form-field>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Contact Email</mat-label>
              <input matInput formControlName="contactEmail">
            </mat-form-field>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Contact Phone</mat-label>
              <input matInput formControlName="contactPhone">
            </mat-form-field>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <mat-form-field appearance="fill">
                <mat-label>Total Blocks</mat-label>
                <input matInput type="number" formControlName="totalBlocks" min="1">
              </mat-form-field>
              <mat-form-field appearance="fill">
                <mat-label>Total Apartments</mat-label>
                <input matInput type="number" formControlName="totalApartments" min="1">
              </mat-form-field>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              
              <mat-form-field appearance="fill">
                <mat-label>Overdue Threshold (Days)</mat-label>
                <input matInput type="number" formControlName="overdueThresholdDays" min="30">
              </mat-form-field>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px">
              <button mat-stroked-button type="button" style="flex:1;height:48px" (click)="editing.set(false)">Cancel</button>
              <button mat-raised-button color="primary" type="submit" style="flex:1;height:48px" [disabled]="saving()">Save</button>
            </div>
          </form>

        </div>
      }
         
  `,
  styles: [`
    .society-brand { text-align:center; padding-bottom:8px;
      .soc-icon { width:64px;height:64px;border-radius:18px;
        background:linear-gradient(135deg,#1565c0,#009688);
        display:flex;align-items:center;justify-content:center;margin:0 auto 10px;
        .material-icons { font-size:32px;color:white; } }
      h2 { font-size:20px;font-weight:700;margin:0; }
    }
    .detail-row { display:flex;justify-content:space-between;padding:10px 0;font-size:14px;
      border-bottom:1px solid var(--border); &:last-child { border:none; }
      .label { color:var(--text-secondary);font-size:13px; }
    }
  `],
})
export class SocietyDetailComponent implements OnInit {
  private readonly svc  = inject(SocietyService);
  private readonly auth = inject(AuthService);
  private readonly fb   = inject(FormBuilder);

  readonly loading  = signal(true);
  readonly saving   = signal(false);
  readonly editing  = signal(false);
  readonly society  = signal<Society | null>(null);
  readonly isAdmin = this.auth.isAdmin;
  readonly form = this.fb.group({
    name:             ['', Validators.required],
    contactEmail:     [''],
    contactPhone:     [''],
    totalBlocks:      [1, Validators.min(1)],
    totalApartments:  [1, Validators.min(1)],
    overdueThresholdDays: [30, Validators.min(0)],
  });

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }
    this.svc.get(sid).subscribe({
      next: s => { this.society.set(s); this.form.patchValue(s as any); this.form.patchValue({ overdueThresholdDays: (s as any).overdueThresholdDays ?? 30 });
        this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  save() {
    const sid = this.auth.societyId()!;
    this.saving.set(true);
    this.svc.update(sid, this.form.value as any).subscribe({
      next: s => { this.society.set(s); this.saving.set(false); this.editing.set(false); },
      error: () => this.saving.set(false),
    });
  }


}
