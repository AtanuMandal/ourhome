import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { Apartment, ApartmentStatus } from '../../core/models/apartment.model';

@Component({
  selector: 'app-apartment-detail',
  standalone: true,
  imports: [
    RouterLink, FormsModule, MatButtonModule, MatIconModule, MatDividerModule,
    MatFormFieldModule, MatInputModule, MatProgressBarModule,
    PageHeaderComponent, StatusChipComponent, LoadingSpinnerComponent,
  ],
  template: `
    <app-page-header [title]="item()?.apartmentNumber ?? 'Apartment'" [showBack]="true">
      <div actions>
        @if (isAdmin() && item()) {
          <a [routerLink]="['/apartments', item()!.id, 'edit']" mat-icon-button aria-label="Edit apartment">
            <mat-icon>edit</mat-icon>
          </a>
        }
      </div>
    </app-page-header>

    <div class="page-content">
      @if (actionLoading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (item()) {
        <div class="card">
          <div class="detail-row"><span class="label">Unit</span><span>{{ item()!.apartmentNumber }}</span></div>
          <mat-divider></mat-divider>
          <div class="detail-row"><span class="label">Rooms</span><span>{{ item()!.numberOfRooms }}</span></div>
          <mat-divider></mat-divider>
          <div class="detail-row"><span class="label">Floor</span><span>{{ item()!.floorNumber }}</span></div>
          @if (item()!.blockName) {
            <mat-divider></mat-divider>
            <div class="detail-row"><span class="label">Block</span><span>{{ item()!.blockName }}</span></div>
          }
          <mat-divider></mat-divider>
          <div class="detail-row">
            <span class="label">Status</span>
            <app-status-chip [status]="item()!.status"></app-status-chip>
          </div>
          @if (item()!.parkingSlots.length) {
            <mat-divider></mat-divider>
            <div class="detail-row"><span class="label">Parking Slots</span><span>{{ item()!.parkingSlots.join(', ') }}</span></div>
          }
          <mat-divider></mat-divider>
          <div class="detail-row"><span class="label">Carpet Area (SQFT)</span><span>{{ item()!.carpetArea }}</span></div>
          <mat-divider></mat-divider>
          <div class="detail-row"><span class="label">BuildUp Area (SQFT)</span><span>{{ item()!.buildUpArea }}</span></div>
          <mat-divider></mat-divider>
          <div class="detail-row"><span class="label">SuperBuild Area (SQFT)</span><span>{{ item()!.superBuildArea }}</span></div>
          <mat-divider></mat-divider>
          <div class="detail-row"><span class="label">Current owner</span><span>{{ currentResidentName('Owner') ?? 'Unassigned' }}</span></div>
          @if (currentResidentName('Tenant')) {
            <mat-divider></mat-divider>
            <div class="detail-row"><span class="label">Current tenant</span><span>{{ currentResidentName('Tenant') }}</span></div>
          }
        </div>

        @if (isAdmin()) {
          <div class="card admin-card">
            <h3>Resident management</h3>
            <p class="admin-copy">Open dedicated pages to review resident history or manage owners, tenants, and household members.</p>
            <div class="action-row">
              <a mat-stroked-button [routerLink]="['/apartments', item()!.id, 'resident-history']">View Resident History</a>
              <a mat-stroked-button [routerLink]="['/apartments', item()!.id, 'transfer-owner']">Transfer Owner</a>
              <a mat-stroked-button [routerLink]="['/apartments', item()!.id, 'transfer-tenant']">Add / Transfer Tenant</a>
              <a mat-stroked-button [routerLink]="['/apartments', item()!.id, 'add-household-member']">Add Family / Co-Occupant</a>
            </div>
          </div>

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
    .admin-card { margin-top: 16px; h3 { margin: 0 0 6px; } }
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
  `],
})
export class ApartmentDetailComponent implements OnInit {
  private readonly svc = inject(ApartmentService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly actionLoading = signal(false);
  readonly item = signal<Apartment | null>(null);
  readonly isAdmin = this.auth.isAdmin;
  statusReason = '';

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

  currentResidentName(residentType: 'Owner' | 'Tenant') {
    return this.item()?.residents?.find(resident => resident.residentType === residentType)?.userName;
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
}
