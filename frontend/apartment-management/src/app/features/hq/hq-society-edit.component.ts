import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { SocietyService } from '../../core/services/society.service';
import { Society } from '../../core/models/society.model';
import { THEMES, DEFAULT_THEME_ID } from '../../core/services/theme.service';

@Component({
  selector: 'app-hq-society-edit',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatDividerModule, MatIconModule,
            PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header title="Edit Society" [showBack]="true"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else {
        <div class="card">
          <p class="section-copy">
            As HQ Admin you can update this society's name, address, and contact details. The society's
            admin account is managed separately and is not changed here.
          </p>
          <form [formGroup]="form" (ngSubmit)="save()" novalidate>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Society Name</mat-label>
              <input matInput formControlName="name">
            </mat-form-field>

            <mat-divider style="margin:16px 0"></mat-divider>
            <div class="section-title">Address</div>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Street</mat-label>
              <input matInput formControlName="street">
            </mat-form-field>
            <div class="two-col">
              <mat-form-field appearance="fill">
                <mat-label>City</mat-label>
                <input matInput formControlName="city">
              </mat-form-field>
              <mat-form-field appearance="fill">
                <mat-label>State</mat-label>
                <input matInput formControlName="state">
              </mat-form-field>
            </div>
            <div class="two-col">
              <mat-form-field appearance="fill">
                <mat-label>Postal Code</mat-label>
                <input matInput formControlName="postalCode">
              </mat-form-field>
              <mat-form-field appearance="fill">
                <mat-label>Country</mat-label>
                <input matInput formControlName="country">
              </mat-form-field>
            </div>

            <mat-divider style="margin:16px 0"></mat-divider>
            <div class="section-title">Contact</div>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Contact Email</mat-label>
              <input matInput formControlName="contactEmail" type="email">
            </mat-form-field>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Contact Phone</mat-label>
              <input matInput formControlName="contactPhone">
            </mat-form-field>

            <mat-divider style="margin:16px 0"></mat-divider>
            <div class="section-title">Theme</div>
            <p class="section-copy">Pick the color theme this society's members see across the web and mobile app.</p>
            <div class="theme-picker" role="radiogroup" aria-label="Society theme">
              @for (theme of themes; track theme.id) {
                <button
                  type="button"
                  class="theme-swatch"
                  [class.theme-swatch--selected]="form.controls.themeId.value === theme.id"
                  role="radio"
                  [attr.aria-checked]="form.controls.themeId.value === theme.id"
                  [attr.aria-label]="theme.label"
                  (click)="form.controls.themeId.setValue(theme.id)">
                  <span class="theme-swatch__dot" [style.background]="theme.primary">
                    @if (form.controls.themeId.value === theme.id) {
                      <mat-icon class="theme-swatch__check">check</mat-icon>
                    }
                  </span>
                  <span class="theme-swatch__label">{{ theme.label }}</span>
                </button>
              }
            </div>

            <button mat-raised-button color="primary" type="submit"
                    class="full-width primary-action" [disabled]="saving() || form.invalid">
              Save Changes
            </button>
          </form>
        </div>
      }
    </div>
  `,
  styles: [`
    .full-width { width:100%; }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .section-title { font-size:15px; font-weight:600; margin-bottom:4px; }
    .section-copy { color:var(--text-secondary); font-size:13px; margin-bottom:16px; }
    .primary-action { margin-top:16px; height:48px; }
    .theme-picker { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:16px; }
    .theme-swatch {
      display:flex; flex-direction:column; align-items:center; gap:6px;
      background:none; border:1px solid transparent; border-radius:var(--radius-sm);
      padding:8px; cursor:pointer; font:inherit;
    }
    .theme-swatch:hover { background: rgba(0,0,0,0.04); }
    .theme-swatch--selected { border-color: var(--primary); }
    .theme-swatch__dot {
      width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
    }
    .theme-swatch__check { color:#fff; font-size:20px; width:20px; height:20px; }
    .theme-swatch__label { font-size:12px; color:var(--text-secondary); }
  `],
})
export class HqSocietyEditComponent implements OnInit {
  private readonly svc = inject(SocietyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly themes = THEMES;
  private society: Society | null = null;

  readonly form = this.fb.group({
    name: ['', Validators.required],
    street: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', Validators.required],
    postalCode: ['', Validators.required],
    country: ['', Validators.required],
    contactEmail: ['', [Validators.required, Validators.email]],
    contactPhone: ['', Validators.required],
    themeId: [DEFAULT_THEME_ID, Validators.required],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }

    this.svc.get(id).subscribe({
      next: society => {
        this.society = society;
        this.form.patchValue({
          name: society.name,
          street: society.address.street,
          city: society.address.city,
          state: society.address.state,
          postalCode: society.address.postalCode,
          country: society.address.country,
          contactEmail: society.contactEmail ?? '',
          contactPhone: society.contactPhone ?? '',
          themeId: society.themeId || DEFAULT_THEME_ID,
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save() {
    if (this.form.invalid || !this.society) return;
    this.saving.set(true);
    const value = this.form.getRawValue();

    this.svc.update(this.society.id, {
      name: value.name.trim(),
      contactEmail: value.contactEmail.trim(),
      contactPhone: value.contactPhone.trim(),
      // Numeric fields the HQ admin doesn't edit here — pass through unchanged.
      totalBlocks: this.society.totalBlocks,
      totalApartments: this.society.totalApartments,
      maintenanceOverdueThresholdDays: this.society.maintenanceOverdueThresholdDays,
      street: value.street.trim(),
      city: value.city.trim(),
      state: value.state.trim(),
      postalCode: value.postalCode.trim(),
      country: value.country.trim(),
      themeId: value.themeId,
      // societyUsers/committees intentionally omitted — HQ admin never manages the society's
      // governance or admin-user assignment from this screen.
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Society updated.', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/hq/societies']);
      },
      error: () => this.saving.set(false),
    });
  }
}
