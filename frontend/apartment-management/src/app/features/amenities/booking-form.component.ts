import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { DatePipe } from '@angular/common';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AmenityService } from '../../core/services/amenity.service';
import { AuthService } from '../../core/services/auth.service';
import { AmenityAvailability, TimeSlot } from '../../core/models/amenity.model';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatProgressBarModule, MatChipsModule,
            DatePipe, PageHeaderComponent],
  template: `
    <app-page-header title="Book Amenity" [showBack]="true"></app-page-header>
    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <div class="page-content">
      <div class="card">
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Date</mat-label>
          <input matInput type="date" [(ngModel)]="selectedDate"
                 [ngModelOptions]="{standalone:true}" (change)="loadSlots()">
        </mat-form-field>

        @if (availability()) {
          <h3 class="slots-title">Available Time Slots</h3>
          <div class="slots-grid">
            @for (slot of availability()!.slots; track slot.startTime) {
              <button class="slot-btn"
                      [class.selected]="selectedSlot()?.startTime === slot.startTime"
                      [class.unavailable]="!slot.isAvailable"
                      [disabled]="!slot.isAvailable"
                      (click)="selectSlot(slot)">
                {{ slot.startTime }} – {{ slot.endTime }}
              </button>
            }
          </div>
        }

        @if (selectedSlot()) {
          <div class="selected-info">
            <span class="material-icons">event_available</span>
            Booked: {{ selectedDate }} {{ selectedSlot()!.startTime }} – {{ selectedSlot()!.endTime }}
          </div>
        }

        <mat-form-field appearance="fill" class="full-width" style="margin-top:16px">
          <mat-label>Notes (optional)</mat-label>
          <textarea matInput [(ngModel)]="notes" [ngModelOptions]="{standalone:true}" rows="2"></textarea>
        </mat-form-field>

        <button mat-raised-button color="primary" class="full-width" style="height:48px"
                [disabled]="!selectedSlot() || bookingLoading()"
                (click)="book()">
          Confirm Booking
        </button>
      </div>
    </div>
  `,
  styleUrl: './booking-form.scss',
})
export class BookingFormComponent implements OnInit {
  private readonly svc    = inject(AmenityService);
  private readonly auth   = inject(AuthService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading        = signal(false);
  readonly bookingLoading = signal(false);
  readonly availability   = signal<AmenityAvailability | null>(null);
  readonly selectedSlot   = signal<TimeSlot | null>(null);

  amenityId    = '';
  selectedDate = new Date().toISOString().split('T')[0];
  notes        = '';

  ngOnInit() {
    this.amenityId = this.route.snapshot.paramMap.get('id')!;
    this.loadSlots();
  }

  loadSlots() {
    const sid = this.auth.societyId()!;
    this.loading.set(true);
    this.selectedSlot.set(null);
    this.svc.getAvailability(sid, this.amenityId, this.selectedDate).subscribe({
      next: a => { this.availability.set(a); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  selectSlot(slot: TimeSlot) {
    if (slot.isAvailable) this.selectedSlot.set(slot);
  }

  book() {
    const sid  = this.auth.societyId()!;
    const user = this.auth.user()!;
    const slot = this.selectedSlot()!;
    this.bookingLoading.set(true);
    this.svc.book(sid, {
      amenityId: this.amenityId,
      date:      this.selectedDate,
      startTime: slot.startTime,
      endTime:   slot.endTime,
      notes:     this.notes,
      userId:    user.id,
    }).subscribe({
      next: () => { this.bookingLoading.set(false); this.router.navigate(['/amenities']); },
      error: () => this.bookingLoading.set(false),
    });
  }
}
