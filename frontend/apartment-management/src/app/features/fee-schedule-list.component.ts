import { Component, inject, signal, OnInit } from '@angular/core';
import { FeeService } from '../core/services/fee.service';

@Component({
  selector: 'app-fee-schedule-list',
  standalone: true,
  template: `
    <h2>Fee Schedules</h2>
    <div *ngIf="loading()">Loading...</div>
    <div *ngIf="!loading()">
      <ul>
        <li *ngFor="let s of schedules()">{{ s.description }} — {{ s.amount }}</li>
      </ul>
    </div>
  `,
})
export class FeeScheduleListComponent implements OnInit {
  private readonly svc = inject(FeeService);
  readonly loading = signal(true);
  readonly schedules = signal<any[]>([]);

  ngOnInit() {
    const societyId = 'TODO-SOCIETY';
    this.svc.listSchedules(societyId).subscribe({
      next: s => { this.schedules.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
