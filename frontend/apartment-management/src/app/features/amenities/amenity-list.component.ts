import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { AmenityService } from '../../core/services/amenity.service';
import { AuthService } from '../../core/services/auth.service';
import { Amenity, AmenityBooking } from '../../core/models/amenity.model';

@Component({
  selector: 'app-amenity-list',
  standalone: true,
  imports: [RouterLink, DatePipe, MatButtonModule, MatIconModule,
            PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent, StatusChipComponent],
  template: `
    <app-page-header title="Amenities"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (items().length === 0) {
        <app-empty-state icon="event_available" title="No amenities" message="No amenities have been added yet.">
          @if (isAdmin()) {
            <a routerLink="new" mat-stroked-button color="primary" style="margin-top:16px">Add Amenity</a>
          }
        </app-empty-state>
      } @else {
        <div class="amenity-grid">
          @for (a of items(); track a.id) {
            <div class="amenity-card">
              <div class="ac-icon"><span class="material-icons">event_seat</span></div>
              <div class="ac-info">
                <h3>{{ a.nm }}</h3>
                <p>{{ a.ds }}</p>
                <div class="ac-hours">
                  <span class="material-icons">schedule</span>
                  {{ a.os }} &ndash; {{ a.oe }}
                </div>
                <div class="ac-cap">Capacity: {{ a.cap }}</div>
              </div>
              <a [routerLink]="['/amenities/book', a.id]" mat-stroked-button color="primary" class="book-btn">
                Book
              </a>
            </div>
          }
        </div>
      }

      <h2 style="margin:24px 0 8px">{{ isAdmin() ? 'All Bookings' : 'My Bookings' }}</h2>
      @if (bookings().length === 0) {
        <p style="color:#777">No bookings yet.</p>
      } @else {
        @for (b of bookings(); track b.id) {
          <div class="card" style="margin-bottom:12px;padding:12px 16px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
              <div>
                <strong>{{ b.an }}</strong>
                <div style="font-size:13px;color:#666">
                  {{ b.stt | date:'MMM d, HH:mm' }} &ndash; {{ b.ent | date:'HH:mm' }}
                </div>
                @if (b.adn) {
                  <div style="font-size:13px;color:#666">Notes: {{ b.adn }}</div>
                }
                @if (b.st === 'Cancelled' && b.cr) {
                  <div style="font-size:13px;color:#c62828">
                    Cancelled{{ b.cid !== b.uid ? ' by admin' : '' }}:
                    {{ b.cr }}
                  </div>
                }
              </div>
              <app-status-chip [status]="b.st"></app-status-chip>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px">
              @if (isAdmin() && b.st === 'Pending') {
                <button mat-stroked-button color="primary" (click)="approve(b)">Approve</button>
                <button mat-stroked-button color="warn" (click)="reject(b)">Reject</button>
              }
              @if (canCancel(b)) {
                <button mat-stroked-button color="warn" (click)="cancel(b)">Cancel Booking</button>
              }
            </div>
          </div>
        }
      }
    </div>
    @if (isAdmin()) {
      <a routerLink="new" mat-fab color="primary" class="fab"><mat-icon>add</mat-icon></a>
    }
  `,
  styleUrl: './amenities.scss',
})
export class AmenityListComponent implements OnInit {
  private readonly svc  = inject(AmenityService);
  private readonly auth = inject(AuthService);

  readonly loading  = signal(true);
  readonly items    = signal<Amenity[]>([]);
  readonly bookings = signal<AmenityBooking[]>([]);
  readonly isAdmin  = this.auth.isAdmin;

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }
    this.svc.list(sid).subscribe({
      next: r => { this.items.set(Array.isArray(r) ? r : (r as any).items ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.loadBookings(sid);
  }

  private loadBookings(sid: string) {
    this.svc.listBookings(sid).subscribe({
      next: r => this.bookings.set(r.items ?? []),
      error: () => this.bookings.set([]),
    });
  }

  /** Owners cancel their own pending/approved bookings; admins can cancel any (with remarks). */
  canCancel(b: AmenityBooking): boolean {
    if (b.st !== 'Pending' && b.st !== 'Approved') return false;
    return this.isAdmin() || b.uid === this.auth.user()?.id;
  }

  cancel(b: AmenityBooking) {
    const sid = this.auth.societyId()!;
    const isOwn = b.uid === this.auth.user()?.id;
    let remarks: string | undefined;
    if (!isOwn) {
      // Admin cancelling a resident's booking must give a reason — shown to the resident.
      const input = window.prompt('Remarks for the resident (required):');
      if (!input || !input.trim()) return;
      remarks = input.trim();
    } else if (!window.confirm('Cancel this booking?')) {
      return;
    }
    this.svc.cancelBooking(sid, b.id, remarks).subscribe({ next: () => this.loadBookings(sid) });
  }

  approve(b: AmenityBooking) {
    const sid = this.auth.societyId()!;
    this.svc.approveBooking(sid, b.id).subscribe({ next: () => this.loadBookings(sid) });
  }

  reject(b: AmenityBooking) {
    const sid = this.auth.societyId()!;
    const notes = window.prompt('Reason for rejection (optional):') ?? undefined;
    this.svc.rejectBooking(sid, b.id, notes).subscribe({ next: () => this.loadBookings(sid) });
  }
}
