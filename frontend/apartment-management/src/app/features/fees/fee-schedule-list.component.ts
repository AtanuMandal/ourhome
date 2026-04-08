import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { FeeService } from '../../core/services/fee.service';
import { AuthService } from '../../core/services/auth.service';
import { FeeSchedule } from '../../core/models/fee.model';

@Component({
  selector: 'app-fee-schedule-list',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, MatButtonModule, MatIconModule,
            PageHeaderComponent, StatusChipComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Fee Schedules"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (items().length === 0) {
        <app-empty-state icon="account_balance_wallet" title="No fee schedules" message="No fees configured yet."></app-empty-state>
      } @else {
        <div class="fee-list">
          @for (f of items(); track f.id) {
            <div class="fee-card">
              <div class="fc-icon">
                <span class="material-icons">receipt_long</span>
              </div>
              <div class="fc-info">
                <span class="fc-name">{{ f.name }}</span>
                <span class="fc-type">{{ f.type }} · {{ f.frequency }}</span>
                @if (f.description) { <span class="fc-desc">{{ f.description }}</span> }
              </div>
              <div class="fc-amount">
                <span class="amount">{{ f.amount | currency:'INR':'symbol':'1.0-0' }}</span>
                <span class="due">Due: day {{ f.dueDay }}</span>
              </div>
            </div>
          }
        </div>

        @if (user()?.apartmentId) {
          <a [routerLink]="['/fees/payments', user()!.apartmentId]"
             mat-stroked-button color="primary" class="full-width" style="margin-top:16px">
            View Payment History
          </a>
        }
      }
    </div>
  `,
  styleUrl: './fees.scss',
})
export class FeeScheduleListComponent implements OnInit {
  private readonly svc  = inject(FeeService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly items   = signal<FeeSchedule[]>([]);
  readonly user    = this.auth.user;

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }
    this.svc.listSchedules(sid).subscribe({
      next: r => { this.items.set(Array.isArray(r) ? r : (r as any).items ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
