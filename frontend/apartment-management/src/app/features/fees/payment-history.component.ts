import { Component, inject, signal, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { FeeService } from '../../core/services/fee.service';
import { AuthService } from '../../core/services/auth.service';
import { Payment } from '../../core/models/fee.model';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatButtonModule,
            PageHeaderComponent, StatusChipComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header title="Payment History" [showBack]="true"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (items().length === 0) {
        <div style="text-align:center;padding:48px;color:var(--text-secondary)">No payment records</div>
      } @else {
        <div class="payment-list">
          @for (p of items(); track p.id) {
            <div class="payment-card">
              <div class="pc-info">
                <span class="pc-name">{{ p.feeScheduleName ?? 'Fee' }}</span>
                <span class="pc-date">Due: {{ p.dueDate | date:'mediumDate' }}</span>
                @if (p.paidDate) {
                  <span class="pc-paid">Paid: {{ p.paidDate | date:'mediumDate' }}</span>
                }
              </div>
              <div class="pc-right">
                <span class="pc-amount">{{ p.amount | currency:'INR':'symbol':'1.0-0' }}</span>
                <app-status-chip [status]="p.status"></app-status-chip>
                @if (p.status !== 'Paid' && isAdmin()) {
                  <button mat-stroked-button color="primary" style="font-size:12px;height:32px" (click)="markPaid(p)">
                    Mark Paid
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './payment-history.scss',
})
export class PaymentHistoryComponent implements OnInit {
  private readonly svc   = inject(FeeService);
  private readonly auth  = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly items   = signal<Payment[]>([]);
  readonly isAdmin = this.auth.isAdmin;

  ngOnInit() {
    const sid = this.auth.societyId()!;
    const aid = this.route.snapshot.paramMap.get('apartmentId')!;
    this.svc.getPaymentHistory(sid, aid).subscribe({
      next: r => { this.items.set(r.items ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  markPaid(p: Payment) {
    const sid  = this.auth.societyId()!;
    const user = this.auth.user()!;
    this.svc.markPaid(sid, p.id, { paidBy: user.id, paidDate: new Date().toISOString() }).subscribe({
      next: updated => this.items.update(arr => arr.map(x => x.id === updated.id ? updated : x)),
    });
  }
}
