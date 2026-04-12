import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ApartmentResidentHistoryResponse } from '../../core/models/apartment.model';
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-apartment-resident-history',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatDividerModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header [title]="history()?.apartmentNumber ? history()!.apartmentNumber + ' Resident History' : 'Resident History'" [showBack]="true"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (history()) {
        <div class="card">
          <div class="detail-row"><span class="label">Current owner</span><span>{{ currentResidentName('Owner') ?? 'Unassigned' }}</span></div>
          <mat-divider></mat-divider>
          <div class="detail-row"><span class="label">Current tenant</span><span>{{ currentResidentName('Tenant') ?? 'Unassigned' }}</span></div>
        </div>

        <div class="card">
          <h3>Owner history</h3>
          @if (history()!.ownershipHistory.length === 0) {
            <p class="empty-copy">No owner history is available for this apartment.</p>
          } @else {
            @for (entry of history()!.ownershipHistory; track entry.userId + entry.fromUtc) {
              <div class="history-row">
                <span>{{ entry.fullName }}</span>
                <span>{{ entry.fromUtc | date:'mediumDate' }} - {{ entry.toUtc ? (entry.toUtc | date:'mediumDate') : 'Present' }}</span>
              </div>
            }
          }
        </div>

        <div class="card">
          <h3>Tenant history</h3>
          @if (history()!.tenantHistory.length === 0) {
            <p class="empty-copy">No tenant history is available for this apartment.</p>
          } @else {
            @for (entry of history()!.tenantHistory; track entry.userId + entry.fromUtc) {
              <div class="history-row">
                <span>{{ entry.fullName }}</span>
                <span>{{ entry.fromUtc | date:'mediumDate' }} - {{ entry.toUtc ? (entry.toUtc | date:'mediumDate') : 'Present' }}</span>
              </div>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .detail-row, .history-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 0;
      font-size: 14px;
    }
    .label, .empty-copy { color: var(--text-secondary); font-size: 13px; }
    h3 { margin: 0 0 8px; }
  `],
})
export class ApartmentResidentHistoryComponent implements OnInit {
  private readonly apartmentService = inject(ApartmentService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly history = signal<ApartmentResidentHistoryResponse | null>(null);

  currentResidentName(residentType: 'Owner' | 'Tenant') {
    return this.history()?.residents.find(resident => resident.residentType === residentType)?.userName;
  }

  ngOnInit() {
    if (!this.auth.isAdmin()) {
      this.router.navigate(['/apartments', this.route.snapshot.paramMap.get('id')]);
      return;
    }

    const sid = this.auth.societyId();
    const id = this.route.snapshot.paramMap.get('id');
    if (!sid || !id) {
      this.loading.set(false);
      return;
    }

    this.apartmentService.getResidentHistory(sid, id).subscribe({
      next: history => {
        this.history.set(history);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
