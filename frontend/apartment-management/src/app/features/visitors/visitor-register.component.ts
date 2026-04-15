import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { VisitorService } from '../../core/services/visitor.service';
import { AuthService } from '../../core/services/auth.service';
import { Visitor } from '../../core/models/visitor.model';
import { ApartmentService, UserService } from '../../core/services/apartment.service';
import { Apartment } from '../../core/models/apartment.model';
import { User } from '../../core/models/user.model';

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
    PageHeaderComponent,
    LoadingSpinnerComponent,
    StatusChipComponent,
  ],
  template: `
    <app-page-header
      [title]="isAdmin() ? 'Register Visitor' : 'Create Visitor Pass'"
      [subtitle]="isAdmin() ? 'Security desk registrations can be approved by the resident later.' : 'Resident-created passes are pre-approved and ready for check-in.'"
      [showBack]="true">
    </app-page-header>

    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else {
        @if (saving()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

        <div class="card">
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Visitor Name</mat-label>
              <input matInput formControlName="visitorName">
              @if (form.controls.visitorName.invalid && form.controls.visitorName.touched) {
                <mat-error>Name is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Phone</mat-label>
              <input matInput type="tel" formControlName="visitorPhone">
              @if (form.controls.visitorPhone.invalid && form.controls.visitorPhone.touched) {
                <mat-error>Phone is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="visitorEmail">
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Purpose of Visit</mat-label>
              <input matInput formControlName="purpose">
              @if (form.controls.purpose.invalid && form.controls.purpose.touched) {
                <mat-error>Purpose is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Vehicle Number</mat-label>
              <input matInput formControlName="vehicleNumber">
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Visiting apartment</mat-label>
              <select matNativeControl formControlName="hostApartmentId">
                <option value="">General society visit</option>
                @for (option of apartmentOptions(); track option.id) {
                  <option [value]="option.id">{{ option.label }}</option>
                }
              </select>
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit"
                    class="full-width submit-btn"
                    [disabled]="saving() || form.invalid">
              {{ isAdmin() ? 'Register Visitor' : 'Create Pre-Approved Pass' }}
            </button>
          </form>
        </div>

        @if (createdVisitor()) {
          <div class="card pass-card">
            <div class="pass-header">
              <div>
                <h3>{{ createdVisitor()!.visitorName }}</h3>
                <p>{{ createdVisitor()!.hostApartmentNumber ?? 'General society visit' }}</p>
              </div>
              <app-status-chip [status]="createdVisitor()!.status"></app-status-chip>
            </div>

            <div class="pass-grid">
              <div><span class="label">Pass Code</span><strong>{{ createdVisitor()!.passCode }}</strong></div>
              <div><span class="label">Purpose</span><span>{{ createdVisitor()!.purpose }}</span></div>
              @if (createdVisitor()!.hostResidentName) {
                <div><span class="label">Resident</span><span>{{ createdVisitor()!.hostResidentName }}</span></div>
              }
              @if (createdVisitor()!.vehicleNumber) {
                <div><span class="label">Vehicle</span><span>{{ createdVisitor()!.vehicleNumber }}</span></div>
              }
            </div>

            @if (createdVisitor()!.qrCode && createdVisitor()!.status !== 'Pending' && createdVisitor()!.status !== 'Denied') {
              <div class="qr-panel">
                <img [src]="qrCodeSrc(createdVisitor()!.qrCode!)" alt="Visitor QR code">
              </div>
            }

            <div class="action-row">
              @if (createdVisitor()!.canCheckIn) {
                <button mat-stroked-button color="primary" type="button" (click)="checkInCreatedVisitor()">
                  Check In
                </button>
              }
              @if (createdVisitor()!.canCheckOut) {
                <button mat-stroked-button type="button" (click)="checkOutCreatedVisitor()">
                  Check Out
                </button>
              }
              <a routerLink="/visitors" mat-flat-button color="primary">View Visitor Log</a>
            </div>

            @if (createdVisitor()!.requiresApproval) {
              <p class="helper-text">Resident approval has been requested for this visitor.</p>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .submit-btn { height: 48px; margin-top: 8px; }
    .pass-card { margin-top: 16px; }
    .pass-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }
    .pass-header h3 { margin: 0 0 4px; }
    .pass-header p { margin: 0; color: var(--text-secondary); font-size: 13px; }
    .pass-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .label {
      display: block;
      color: var(--text-secondary);
      font-size: 12px;
      margin-bottom: 4px;
    }
    .qr-panel {
      display: flex;
      justify-content: center;
      padding: 12px;
      border: 1px dashed var(--border);
      border-radius: 12px;
      margin-bottom: 16px;
    }
    .qr-panel img {
      width: 180px;
      height: 180px;
      object-fit: contain;
    }
    .action-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .helper-text {
      margin: 12px 0 0;
      color: var(--text-secondary);
      font-size: 13px;
    }
  `],
})
export class VisitorRegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly visitorSvc = inject(VisitorService);
  private readonly userSvc = inject(UserService);
  private readonly apartmentSvc = inject(ApartmentService);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly createdVisitor = signal<Visitor | null>(null);
  readonly apartmentOptions = signal<Array<{ id: string; label: string }>>([]);
  readonly isAdmin = this.auth.isAdmin;

  readonly form = this.fb.group({
    visitorName: ['', Validators.required],
    visitorPhone: ['', Validators.required],
    visitorEmail: [''],
    purpose: ['', Validators.required],
    vehicleNumber: [''],
    hostApartmentId: [''],
  });

  ngOnInit() {
    this.loadContext();
  }

  submit() {
    if (this.form.invalid) return;

    const sid = this.auth.societyId();
    if (!sid) return;

    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.visitorSvc.register(sid, {
      visitorName: raw.visitorName.trim(),
      visitorPhone: raw.visitorPhone.trim(),
      visitorEmail: raw.visitorEmail.trim() || undefined,
      purpose: raw.purpose.trim(),
      vehicleNumber: raw.vehicleNumber.trim() || undefined,
      hostApartmentId: raw.hostApartmentId || undefined,
    }).subscribe({
      next: visitor => {
        this.createdVisitor.set(visitor);
        this.saving.set(false);
        this.snackBar.open(
          visitor.requiresApproval ? 'Visitor registered and resident approval requested.' : 'Visitor pass created.',
          'Dismiss',
          { duration: 4000 }
        );
      },
      error: () => this.saving.set(false),
    });
  }

  checkInCreatedVisitor() {
    const visitor = this.createdVisitor();
    const sid = this.auth.societyId();
    if (!sid || !visitor) return;

    this.saving.set(true);
    this.visitorSvc.checkin(sid, visitor.id, visitor.passCode).subscribe({
      next: updated => {
        this.createdVisitor.set(updated);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  checkOutCreatedVisitor() {
    const visitor = this.createdVisitor();
    const sid = this.auth.societyId();
    if (!sid || !visitor) return;

    this.saving.set(true);
    this.visitorSvc.checkout(sid, visitor.id).subscribe({
      next: updated => {
        this.createdVisitor.set(updated);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  qrCodeSrc(qrCode: string) {
    return qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`;
  }

  private loadContext() {
    const sid = this.auth.societyId();
    const currentUser = this.auth.user();
    if (!sid || !currentUser) {
      this.loading.set(false);
      return;
    }

    if (this.isAdmin()) {
      this.apartmentSvc.list(sid, 1, 500).subscribe({
        next: result => {
          this.apartmentOptions.set(this.toApartmentOptions(result.items ?? []));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
      return;
    }

    this.userSvc.get(sid, currentUser.id).subscribe({
      next: user => {
        this.apartmentOptions.set(this.toUserApartmentOptions(user));
        if (!this.form.controls.hostApartmentId.value && this.apartmentOptions().length > 0) {
          this.form.controls.hostApartmentId.setValue(this.apartmentOptions()[0].id);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private toApartmentOptions(apartments: Apartment[]) {
    return apartments.map(apartment => ({
      id: apartment.id,
      label: apartment.blockName ? `${apartment.apartmentNumber} - ${apartment.blockName}` : apartment.apartmentNumber,
    }));
  }

  private toUserApartmentOptions(user: User) {
    return (user.apartments ?? []).map(apartment => ({
      id: apartment.apartmentId,
      label: `${apartment.name} (${apartment.residentType})`,
    }));
  }
}
