import { Component, inject, signal, OnInit } from '@angular/core';
import { FeeService } from '../core/services/fee.service';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-fee-history',
  standalone: true,
  template: `
    <h2>Payment History</h2>
    <div *ngIf="loading()">Loading...</div>
    <div *ngIf="!loading()">
      <ul>
        <li *ngFor="let p of payments()">{{ p.description }} — {{ p.amount }} — {{ p.status }}</li>
      </ul>
    </div>
  `,
})
export class FeeHistoryComponent implements OnInit {
  private readonly svc = inject(FeeService);
  private readonly auth = inject(AuthService);
  readonly loading = signal(true);
  readonly payments = signal<any[]>([]);

  ngOnInit() {
    const societyId = this.auth.societyId() || 'TODO';
    const aptId = this.auth.apartmentId() || '';
    this.svc.listPayments(societyId, aptId).subscribe({
      next: r => { this.payments.set(r.items ?? r as any); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
