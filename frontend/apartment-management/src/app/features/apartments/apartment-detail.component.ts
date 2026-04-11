import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ApartmentService, UserService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { Apartment, ApartmentStatus } from '../../core/models/apartment.model';

@Component({
  selector: 'app-apartment-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, FormsModule, MatButtonModule, MatIconModule, MatDividerModule,
            MatFormFieldModule, MatInputModule, MatProgressBarModule,
            PageHeaderComponent, StatusChipComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header [title]="item()?.apartmentNumber ?? 'Apartment'" [showBack]="true">
      <div actions>
        @if (isAdmin()) {
          <a [routerLink]="[item()?.id, 'edit']" mat-icon-button><mat-icon>edit</mat-icon></a>
        }
      </div>
    </app-page-header>
    <div class="page-content">
      @if (actionLoading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (item()) {
        <div class="card">
          <div class="detail-row">
            <span class="label">Unit</span><span>{{ item()!.apartmentNumber }}</span>
          </div>
          <mat-divider></mat-divider>
          <div class="detail-row">
            <span class="label">Rooms</span><span>{{ item()!.numberOfRooms }}</span>
          </div>
          <mat-divider></mat-divider>
          <div class="detail-row">
            <span class="label">Floor</span><span>{{ item()!.floorNumber }}</span>
          </div>
          @if (item()!.blockName) {
            <mat-divider></mat-divider>
            <div class="detail-row">
              <span class="label">Block</span><span>{{ item()!.blockName }}</span>
            </div>
          }
          <mat-divider></mat-divider>
          <div class="detail-row">
            <span class="label">Status</span>
            <app-status-chip [status]="item()!.status"></app-status-chip>
          </div>
          @if (item()!.parkingSlots.length) {
            <mat-divider></mat-divider>
            <div class="detail-row">
              <span class="label">Parking Slots</span><span>{{ item()!.parkingSlots.join(', ') }}</span>
            </div>
          }
        </div>

        <div class="card">
          <h3>Resident history</h3>
          <div class="detail-row">
            <span class="label">Current owner</span><span>{{ item()!.ownerId ?? 'Unassigned' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Current tenant</span><span>{{ item()!.tenantId ?? 'Unassigned' }}</span>
          </div>

          @if (item()!.ownershipHistory?.length) {
            <mat-divider></mat-divider>
            <p class="history-title">Owner history</p>
            @for (entry of item()!.ownershipHistory!; track entry.userId + entry.startDate) {
              <div class="history-row">
                <span>{{ entry.fullName }}</span>
                <span>{{ entry.startDate | date:'mediumDate' }} - {{ entry.endDate ? (entry.endDate | date:'mediumDate') : 'Present' }}</span>
              </div>
            }
          }

          @if (item()!.tenantHistory?.length) {
            <mat-divider></mat-divider>
            <p class="history-title">Tenant history</p>
            @for (entry of item()!.tenantHistory!; track entry.userId + entry.startDate) {
              <div class="history-row">
                <span>{{ entry.fullName }}</span>
                <span>{{ entry.startDate | date:'mediumDate' }} - {{ entry.endDate ? (entry.endDate | date:'mediumDate') : 'Present' }}</span>
              </div>
            }
          }
        </div>

        @if (isAdmin()) {
          <div class="card admin-card">
            <h3>Admin actions</h3>
            <p class="admin-copy">Update apartment availability or remove the apartment from the society.</p>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Status change reason</mat-label>
              <textarea matInput [(ngModel)]="statusReason" rows="3"
                        placeholder="Add a note for maintenance or vacancy changes"></textarea>
            </mat-form-field>

            <div class="action-row">
              <button mat-stroked-button type="button"
                      (click)="changeStatus('Available')"
                      [disabled]="actionLoading() || item()!.status === 'Available'">
                Mark Available
              </button>
              <button mat-stroked-button color="primary" type="button"
                      (click)="changeStatus('UnderMaintenance')"
                      [disabled]="actionLoading() || item()!.status === 'UnderMaintenance'">
                Under Maintenance
              </button>
              <button mat-flat-button color="warn" type="button"
                      (click)="deleteApartment()"
                      [disabled]="actionLoading() || item()!.status === 'Occupied'">
                Delete Apartment
              </button>
            </div>

            <p class="helper-text">
              Occupied apartments cannot be deleted. Marking an apartment available clears its current owner and tenant assignment.
            </p>
          </div>

          <div class="card admin-card">
            <h3>Transfer owner or tenant</h3>
            <div class="action-grid">
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Resident name</mat-label>
                <input matInput [(ngModel)]="transferFullName">
              </mat-form-field>
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Email</mat-label>
                <input matInput [(ngModel)]="transferEmail">
              </mat-form-field>
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Phone</mat-label>
                <input matInput [(ngModel)]="transferPhone">
              </mat-form-field>
            </div>
            <div class="action-row">
              <button mat-stroked-button type="button" (click)="transferOwnership()" [disabled]="actionLoading()">Transfer Ownership</button>
              <button mat-stroked-button type="button" (click)="transferTenancy()" [disabled]="actionLoading()">Transfer Tenancy</button>
            </div>
          </div>

          <div class="card admin-card">
            <h3>Add family member or co-occupant</h3>
            <div class="action-grid">
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Household member name</mat-label>
                <input matInput [(ngModel)]="memberFullName">
              </mat-form-field>
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Email</mat-label>
                <input matInput [(ngModel)]="memberEmail">
              </mat-form-field>
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Phone</mat-label>
                <input matInput [(ngModel)]="memberPhone">
              </mat-form-field>
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Resident type</mat-label>
                <input matInput [(ngModel)]="memberResidentType" placeholder="FamilyMember or CoOccupant">
              </mat-form-field>
            </div>
            <div class="action-row">
              <button mat-stroked-button type="button" (click)="addHouseholdMember()" [disabled]="actionLoading()">Add household member</button>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .detail-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 0; font-size: 14px;
      .label { color: var(--text-secondary); font-size: 13px; }
    }
    .resident-row {
      display: flex; align-items: center; gap: 12px; padding: 8px 0;
      .res-info { flex:1; display:flex; flex-direction:column; }
    }
    .owner-tag {
      font-size: 11px; font-weight: 600; color: var(--primary-light);
      background: rgba(25,118,210,.1); padding: 2px 8px; border-radius: 999px;
    }
    .admin-card {
      margin-top: 16px;
      h3 { margin: 0 0 6px; }
    }
    .admin-copy, .helper-text {
      color: var(--text-secondary);
      font-size: 13px;
      margin: 0 0 12px;
    }
    .action-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 12px;
    }
    .action-grid, .history-row {
      display: grid;
      gap: 12px;
    }
    .history-title {
      margin: 12px 0 8px;
      font-weight: 600;
    }
   `],
})
export class ApartmentDetailComponent implements OnInit {
   private readonly svc   = inject(ApartmentService);
   private readonly userSvc = inject(UserService);
   private readonly auth  = inject(AuthService);
   private readonly route = inject(ActivatedRoute);
   private readonly router = inject(Router);
   private readonly snackBar = inject(MatSnackBar);

   readonly loading = signal(true);
   readonly actionLoading = signal(false);
   readonly item    = signal<Apartment | null>(null);
   readonly isAdmin = this.auth.isAdmin;
   statusReason = '';
   transferFullName = '';
   transferEmail = '';
   transferPhone = '';
   memberFullName = '';
   memberEmail = '';
   memberPhone = '';
   memberResidentType: 'FamilyMember' | 'CoOccupant' = 'FamilyMember';

   ngOnInit() {
     this.loadApartment();
   }

   changeStatus(status: Extract<ApartmentStatus, 'Available' | 'UnderMaintenance'>) {
     const sid = this.auth.societyId();
     const apartment = this.item();
     if (!sid || !apartment) return;

     const reason = this.statusReason.trim() ||
       (status === 'Available'
         ? 'Marked available from apartment onboarding'
         : 'Marked under maintenance from apartment onboarding');

     this.actionLoading.set(true);
     this.svc.changeStatus(sid, apartment.id, { status, reason }).subscribe({
       next: () => {
         this.statusReason = '';
         this.actionLoading.set(false);
         this.loadApartment();
         this.snackBar.open(`Apartment marked ${status}.`, 'Dismiss', { duration: 3000 });
       },
       error: () => this.actionLoading.set(false),
     });
   }

    deleteApartment() {
     const sid = this.auth.societyId();
     const apartment = this.item();
     if (!sid || !apartment) return;
     if (!window.confirm(`Delete apartment ${apartment.apartmentNumber}?`)) return;

     this.actionLoading.set(true);
     this.svc.delete(sid, apartment.id).subscribe({
       next: () => {
         this.actionLoading.set(false);
         this.snackBar.open('Apartment deleted.', 'Dismiss', { duration: 3000 });
         this.router.navigate(['/apartments']);
       },
       error: () => this.actionLoading.set(false),
     });
    }

    transferOwnership() {
      this.runResidentAction(dto => this.userSvc.transferOwnership(dto.sid, dto.apartmentId, dto.payload), 'Ownership transferred.');
    }

    transferTenancy() {
      this.runResidentAction(dto => this.userSvc.transferTenancy(dto.sid, dto.apartmentId, dto.payload), 'Tenancy transferred.');
    }

    addHouseholdMember() {
      const sid = this.auth.societyId();
      const apartment = this.item();
      if (!sid || !apartment || !this.memberFullName || !this.memberEmail) return;

      this.actionLoading.set(true);
      this.userSvc.addHouseholdMember(sid, apartment.id, {
        fullName: this.memberFullName,
        email: this.memberEmail,
        phone: this.memberPhone,
        residentType: this.memberResidentType,
      }).subscribe({
        next: () => {
          this.memberFullName = '';
          this.memberEmail = '';
          this.memberPhone = '';
          this.actionLoading.set(false);
          this.snackBar.open('Household member added.', 'Dismiss', { duration: 3000 });
        },
        error: () => this.actionLoading.set(false),
      });
    }

    private loadApartment() {
     const sid = this.auth.societyId();
     const id = this.route.snapshot.paramMap.get('id');
     if (!sid || !id) {
       this.loading.set(false);
       return;
     }

     this.loading.set(true);
      this.svc.get(sid, id).subscribe({
       next: a => {
         this.item.set(a);
         this.loading.set(false);
       },
       error: () => this.loading.set(false),
      });
    }

    private runResidentAction(
      action: (dto: { sid: string; apartmentId: string; payload: { fullName: string; email: string; phone: string } }) => any,
      successMessage: string,
    ) {
      const sid = this.auth.societyId();
      const apartment = this.item();
      if (!sid || !apartment || !this.transferFullName || !this.transferEmail) return;

      this.actionLoading.set(true);
      action({
        sid,
        apartmentId: apartment.id,
        payload: { fullName: this.transferFullName, email: this.transferEmail, phone: this.transferPhone },
      }).subscribe({
        next: () => {
          this.transferFullName = '';
          this.transferEmail = '';
          this.transferPhone = '';
          this.actionLoading.set(false);
          this.loadApartment();
          this.snackBar.open(successMessage, 'Dismiss', { duration: 3000 });
        },
        error: () => this.actionLoading.set(false),
      });
    }
}
