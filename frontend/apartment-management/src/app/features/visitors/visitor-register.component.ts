import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Apartment, formatApartmentLabel } from '../../core/models/apartment.model';
import { Visitor } from '../../core/models/visitor.model';
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { VisitorService } from '../../core/services/visitor.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';

@Component({
  selector: 'app-visitor-register',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatSelectModule,
    PageHeaderComponent,
    StatusChipComponent
  ],
  template: `
    <app-page-header
      [title]="pageTitle()"
      [showBack]="true">
    </app-page-header>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    <div class="page-content visitor-register-page">
      @if (errorMessage()) {
        <div class="card error-banner">{{ errorMessage() }}</div>
      }

      <div class="card">
        <div class="form-header">
          <h3>{{ formTitle() }}</h3>
          <p>{{ formDescription() }}</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (isAdmin()) {
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Apartment</mat-label>
              <mat-select formControlName="apartmentId">
                @for (apartment of apartments(); track apartment.id) {
                  <mat-option [value]="apartment.id">
                    {{ apartmentLabel(apartment) }}
                  </mat-option>
                }
              </mat-select>
              @if (form.get('apartmentId')?.invalid && form.get('apartmentId')?.touched) {
                <mat-error>Select an apartment</mat-error>
              }
            </mat-form-field>
          } @else {
            <div class="resident-target">
              <span class="resident-target__label">Apartment</span>
              <strong>{{ residentApartmentLabel() }}</strong>
              <small>This pass will be generated for your apartment only.</small>
            </div>
          }

          <div class="form-grid">
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Visitor name</mat-label>
              <input matInput formControlName="visitorName">
              @if (form.get('visitorName')?.invalid && form.get('visitorName')?.touched) {
                <mat-error>Name is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Phone</mat-label>
              <input matInput type="tel" formControlName="visitorPhone">
              @if (form.get('visitorPhone')?.invalid && form.get('visitorPhone')?.touched) {
                <mat-error>Phone is required</mat-error>
              }
            </mat-form-field>
          </div>

          <div class="form-grid">
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="visitorEmail">
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Company / service type</mat-label>
              <input matInput formControlName="companyName" placeholder="Amazon, Swiggy, Personal, Courier">
            </mat-form-field>
          </div>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Purpose</mat-label>
            <input matInput formControlName="purpose" placeholder="Delivery, guest visit, electrician, etc.">
            @if (form.get('purpose')?.invalid && form.get('purpose')?.touched) {
              <mat-error>Purpose is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Vehicle / bike / car number</mat-label>
            <input matInput formControlName="vehicleNumber">
          </mat-form-field>

          <button
            mat-raised-button
            color="primary"
            type="submit"
            class="full-width submit-btn"
            [disabled]="loading() || form.invalid || (!isAdmin() && !resolvedApartmentId())">
            {{ submitLabel() }}
          </button>
        </form>
      </div>

      @if (createdVisitor()) {
        <div class="card pass-card">
          <div class="pass-card__header">
            <div>
              <h3>{{ createdVisitor()!.visitorName }}</h3>
              <p>{{ createdVisitor()!.purpose }} for {{ createdVisitor()!.hostFlatNumber }}</p>
            </div>
            <app-status-chip [status]="createdVisitor()!.status"></app-status-chip>
          </div>

          <div class="pass-card__body">
            <div>
              <span class="pass-card__label">Pass code</span>
              <strong class="pass-card__code">{{ createdVisitor()!.passCode }}</strong>
            </div>
            <div>
              <span class="pass-card__label">Resident</span>
              <strong>{{ createdVisitor()!.hostResidentName }}</strong>
            </div>
            @if (qrImageUrl()) {
              <div class="pass-card__qr">
                <span class="pass-card__label">QR pass</span>
                <img [src]="qrImageUrl()!" alt="Visitor QR pass">
              </div>
            }
          </div>

          <p class="pass-card__note">
            @if (createdVisitor()!.isPreApproved) {
              Share this pass with security for quick verification and check-in.
            } @else {
              Visitor request created. Resident approval is still required before entry.
            }
          </p>

          <div class="pass-card__actions">
            <a mat-stroked-button color="primary" routerLink="/visitors">View visitor history</a>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './visitors.scss'
})
export class VisitorRegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly visitorService = inject(VisitorService);
  private readonly apartmentService = inject(ApartmentService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly apartments = signal<Apartment[]>([]);
  readonly createdVisitor = signal<Visitor | null>(null);
  readonly errorMessage = signal('');
  readonly isAdmin = this.auth.isAdmin;

  readonly residentApartmentLabel = computed(() => {
    const user = this.auth.user();
    return user?.apartments?.[0]?.name ?? 'Your apartment';
  });

  readonly resolvedApartmentId = computed(() => {
    if (this.isAdmin()) {
      return this.form.controls.apartmentId.value?.trim() ?? '';
    }

    const user = this.auth.user();
    return user?.apartmentId ?? user?.apartments?.[0]?.apartmentId ?? '';
  });

  readonly form = this.fb.group({
    apartmentId: [''],
    visitorName: ['', Validators.required],
    visitorPhone: ['', Validators.required],
    visitorEmail: ['', Validators.email],
    companyName: [''],
    purpose: ['', Validators.required],
    vehicleNumber: ['']
  });

  ngOnInit(): void {
    if (!this.isAdmin()) {
      this.form.controls.apartmentId.clearValidators();
      this.form.controls.apartmentId.updateValueAndValidity({ emitEvent: false });
      return;
    }

    const societyId = this.auth.societyId();
    if (!societyId) {
      return;
    }

    this.apartmentService.list(societyId, 1, 200).subscribe({
      next: response => this.apartments.set(response.items ?? []),
      error: () => this.errorMessage.set('Unable to load apartments right now.')
    });

    this.form.controls.apartmentId.setValidators([Validators.required]);
    this.form.controls.apartmentId.updateValueAndValidity({ emitEvent: false });
  }

  pageTitle() {
    return this.isAdmin() ? 'Register Visitor' : 'Pre-approve Visitor';
  }

  formTitle() {
    return this.isAdmin() ? 'Gate registration' : 'Resident pass generation';
  }

  formDescription() {
    return this.isAdmin()
      ? 'Register the visitor at the gate and send the request to the resident for approval.'
      : 'Pre-enter visitor details to generate an approved pass before arrival.';
  }

  submitLabel() {
    return this.isAdmin() ? 'Register visitor request' : 'Pre-approve & generate pass';
  }

  apartmentLabel(apartment: Apartment) {
    return formatApartmentLabel(apartment);
  }

  qrImageUrl() {
    const qrCode = this.createdVisitor()?.qrCode;
    if (!qrCode) {
      return null;
    }

    return qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const societyId = this.auth.societyId();
    const apartmentId = this.resolvedApartmentId();
    if (!societyId || !apartmentId) {
      this.errorMessage.set('A target apartment is required to continue.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.visitorService.register(societyId, {
      visitorName: this.form.controls.visitorName.value?.trim() ?? '',
      visitorPhone: this.form.controls.visitorPhone.value?.trim() ?? '',
      visitorEmail: this.form.controls.visitorEmail.value?.trim() ?? undefined,
      purpose: this.form.controls.purpose.value?.trim() ?? '',
      apartmentId,
      companyName: this.form.controls.companyName.value?.trim() ?? undefined,
      vehicleNumber: this.form.controls.vehicleNumber.value?.trim() ?? undefined,
      isPreApproved: !this.isAdmin()
    }).subscribe({
      next: visitor => {
        this.createdVisitor.set(visitor);
        this.loading.set(false);
      },
      error: error => {
        this.errorMessage.set(error?.error?.message ?? 'Unable to register the visitor right now.');
        this.loading.set(false);
      }
    });
  }
}
