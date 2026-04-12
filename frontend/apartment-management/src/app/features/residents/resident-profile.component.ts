import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { UserService, ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { Apartment } from '../../core/models/apartment.model';

type ResidentApartmentType = 'Owner' | 'Tenant';

@Component({
  selector: 'app-resident-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    PageHeaderComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <app-page-header [title]="user()?.fullName ?? user()?.name ?? 'Profile'" [showBack]="true"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (user()) {
        <div class="profile-header">
          <div class="avatar avatar-xl">{{ initials() }}</div>
          <h2>{{ user()!.fullName ?? user()!.name }}</h2>
          <span class="role-chip">{{ user()!.role }}</span>
        </div>

        <div class="card" style="margin-top:16px">
          <div class="row"><span class="label">Email</span><span>{{ user()!.email }}</span></div>
          @if (user()!.phone) {
            <div class="row"><span class="label">Phone</span><span>{{ user()!.phone }}</span></div>
          }
          <div class="row"><span class="label">Resident Type</span><span>{{ user()!.residentType }}</span></div>
          <div class="row"><span class="label">Primary Apartment</span><span>{{ primaryApartmentLabel() }}</span></div>
        </div>

        <div class="card" style="margin-top:16px">
          <div class="section-title">Linked Apartments</div>
          @if (user()!.apartments?.length) {
            <div class="linked-apartments">
              @for (apartment of user()!.apartments!; track apartment.apartmentId) {
                <div class="apartment-pill">
                  <div class="apartment-pill__details">
                    <span>{{ apartment.name }}</span>
                    <span class="pill-type">{{ apartment.residentType }}</span>
                  </div>
                  @if (canRemoveApartment()) {
                    <button mat-stroked-button color="warn" type="button"
                            (click)="removeApartment(apartment.apartmentId, apartment.name)"
                            [disabled]="removingApartmentId() === apartment.apartmentId">
                      Remove
                    </button>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="empty-copy">No apartments linked yet.</div>
          }
        </div>

        @if (isAdmin() && canAddApartment()) {
          <div class="card" style="margin-top:16px">
            <div class="section-title">Add Another Apartment</div>
            <form [formGroup]="addApartmentForm" (ngSubmit)="addApartment()" novalidate>
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Apartment</mat-label>
                <select matNativeControl formControlName="apartmentId">
                  <option value="" disabled>Select an apartment</option>
                  @for (apartment of availableApartments(); track apartment.id) {
                    <option [value]="apartment.id">{{ apartment.apartmentNumber }} - {{ apartment.blockName }}</option>
                  }
                </select>
                @if (addApartmentForm.controls.apartmentId.invalid && addApartmentForm.controls.apartmentId.touched) {
                  <mat-error>Apartment is required</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Resident Type</mat-label>
                <select matNativeControl formControlName="residentType">
                  <option value="Owner">Owner</option>
                  <option value="Tenant">Tenant</option>
                </select>
              </mat-form-field>

              <button mat-raised-button color="primary" type="submit"
                      [disabled]="addingApartment() || addApartmentForm.invalid || availableApartments().length === 0">
                Add Apartment
              </button>
            </form>

            @if (availableApartments().length === 0) {
              <div class="empty-copy" style="margin-top:12px;">No additional apartments are available for this resident.</div>
            }
          </div>
        }

        @if (!canAddApartment()) {
          <div class="card" style="margin-top:16px">
            <div class="empty-copy">Additional apartments are currently supported for owner and tenant residents only.</div>
          </div>
        }
      }
      @if (addingApartment()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    </div>
  `,
  styles: [`
    .profile-header { text-align:center; padding:32px 16px 16px;
      .avatar-xl { width:80px;height:80px;font-size:28px;margin:0 auto 12px;
        border-radius:50%;background:var(--primary-light);color:white;
        display:flex;align-items:center;justify-content:center;font-weight:700; }
      h2 { font-size:20px;margin:0 0 4px; }
    }
    .role-chip { font-size:12px;background:rgba(25,118,210,.1);color:var(--primary-light);
      padding:3px 10px;border-radius:999px;font-weight:500; }
    .row { display:flex;justify-content:space-between;padding:12px 0;font-size:14px;
      border-bottom:1px solid var(--border); gap: 16px;
      &:last-child { border-bottom:none; }
      .label { color:var(--text-secondary);font-size:13px; } }
    .section-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
    .linked-apartments { display:flex; flex-direction:column; gap:8px; }
    .apartment-pill { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 12px;
      border:1px solid var(--border); border-radius:12px; background:#fafafa; }
    .apartment-pill__details { display:flex; flex-direction:column; gap:4px; }
    .pill-type { font-size:12px; color:var(--primary-light); font-weight:600; }
    .empty-copy { color:var(--text-secondary); font-size:13px; }
  `],
})
export class ResidentProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly userSvc = inject(UserService);
  private readonly apartmentSvc = inject(ApartmentService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly addingApartment = signal(false);
  readonly removingApartmentId = signal<string | null>(null);
  readonly user = signal<User | null>(null);
  readonly apartments = signal<Apartment[]>([]);
  readonly isAdmin = this.auth.isAdmin;

  readonly addApartmentForm = this.fb.group({
    apartmentId: ['', Validators.required],
    residentType: ['Owner' as ResidentApartmentType, Validators.required],
  });

  initials = () => (this.user()?.fullName ?? this.user()?.name ?? '')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '';

  ngOnInit() {
    this.loadProfile();
  }

  canAddApartment() {
    const residentType = this.user()?.residentType;
    return residentType === 'Owner' || residentType === 'Tenant';
  }

  availableApartments() {
    const resident = this.user();
    if (!resident || !this.canAddApartment()) return [];

    const linkedApartmentIds = new Set((resident.apartments ?? []).map(apartment => apartment.apartmentId));
    const selectedResidentType = this.addApartmentForm.controls.residentType.value;
    return this.apartments().filter(apartment => {
      if (linkedApartmentIds.has(apartment.id)) return false;
      const currentOwner = apartment.residents?.find(current => current.residentType === 'Owner');
      const currentTenant = apartment.residents?.find(current => current.residentType === 'Tenant');

      if (selectedResidentType === 'Owner') return !currentOwner || currentOwner.userId === resident.id;
      return !currentTenant || currentTenant.userId === resident.id;
    });
  }

  canRemoveApartment() {
    return this.auth.user()?.role === 'SUAdmin';
  }

  primaryApartmentLabel() {
    const resident = this.user();
    if (!resident?.apartments?.length) return resident?.apartmentId ?? '–';
    const primaryApartment = resident.apartments.find(apartment => apartment.apartmentId === resident.apartmentId)
      ?? resident.apartments[0];
    return primaryApartment.name;
  }

  addApartment() {
    if (this.addApartmentForm.invalid || !this.user()) return;
    const sid = this.auth.societyId();
    if (!sid) return;

    this.addingApartment.set(true);
    this.userSvc.addApartment(sid, this.user()!.id, {
      apartmentId: this.addApartmentForm.getRawValue().apartmentId,
      residentType: this.addApartmentForm.getRawValue().residentType,
    }).subscribe({
      next: updatedUser => {
        this.user.set(updatedUser);
        this.addApartmentForm.reset({ apartmentId: '', residentType: 'Owner' });
        this.addingApartment.set(false);
        this.loadApartments();
        this.snackBar.open('Apartment linked to resident.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.addingApartment.set(false),
    });
  }

  removeApartment(apartmentId: string, apartmentName: string) {
    const sid = this.auth.societyId();
    const resident = this.user();
    if (!sid || !resident || !this.canRemoveApartment()) return;
    if (!window.confirm(`Remove ${apartmentName} from ${resident.fullName ?? resident.name}?`)) return;

    this.removingApartmentId.set(apartmentId);
    this.userSvc.removeApartment(sid, resident.id, apartmentId).subscribe({
      next: updatedUser => {
        this.user.set(updatedUser);
        this.removingApartmentId.set(null);
        this.loadApartments();
        this.snackBar.open('Apartment removed from resident.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.removingApartmentId.set(null),
    });
  }

  private loadProfile() {
    const sid = this.auth.societyId()!;
    const id = this.route.snapshot.paramMap.get('id')!;
    forkJoin({
      user: this.userSvc.get(sid, id),
      apartments: this.apartmentSvc.list(sid, 1, 500),
    }).subscribe({
      next: ({ user, apartments }) => {
        this.user.set(user);
        this.apartments.set(apartments.items ?? []);
        if (user.residentType === 'Owner' || user.residentType === 'Tenant') {
          this.addApartmentForm.patchValue({ residentType: user.residentType });
        }
        this.loading.set(false);

        if (this.route.snapshot.queryParamMap.get('addApartment') === '1' && this.canAddApartment()) {
          this.snackBar.open('Resident already exists. Add the new apartment below.', 'Dismiss', { duration: 5000 });
        }
      },
      error: () => this.loading.set(false),
    });
  }

  private loadApartments() {
    const sid = this.auth.societyId();
    if (!sid) return;

    this.apartmentSvc.list(sid, 1, 500).subscribe({
      next: response => this.apartments.set(response.items ?? []),
    });
  }
}
