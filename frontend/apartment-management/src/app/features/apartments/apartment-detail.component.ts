import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { Apartment } from '../../core/models/apartment.model';

@Component({
  selector: 'app-apartment-detail',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatDividerModule,
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
          @if (item()!.parkingSlots) {
            <mat-divider></mat-divider>
            <div class="detail-row">
              <span class="label">Parking Slots</span><span>{{ item()!.parkingSlots }}</span>
            </div>
          }
        </div>
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
  `],
})
export class ApartmentDetailComponent implements OnInit {
  private readonly svc   = inject(ApartmentService);
  private readonly auth  = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly item    = signal<Apartment | null>(null);
  readonly isAdmin = this.auth.isAdmin;

  ngOnInit() {
    const sid = this.auth.societyId()!;
    const id  = this.route.snapshot.paramMap.get('id')!;
    this.svc.get(sid, id).subscribe({
      next: a => { this.item.set(a); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}

