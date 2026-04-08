import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { VisitorService } from '../../core/services/visitor.service';
import { AuthService } from '../../core/services/auth.service';
import { Visitor } from '../../core/models/visitor.model';

@Component({
  selector: 'app-visitor-list',
  standalone: true,
  imports: [RouterLink, DatePipe, MatButtonModule, MatIconModule,
            PageHeaderComponent, StatusChipComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Visitors"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (items().length === 0) {
        <app-empty-state icon="badge" title="No visitors" message="No visitor records found.">
          <a routerLink="register" mat-stroked-button color="primary" style="margin-top:16px">Register Visitor</a>
        </app-empty-state>
      } @else {
        <div class="visitor-list">
          @for (v of items(); track v.id) {
            <div class="visitor-card">
              <div class="vc-avatar">{{ v.visitorName[0] }}</div>
              <div class="vc-info">
                <span class="vc-name">{{ v.visitorName }}</span>
                <span class="vc-purpose">{{ v.purpose }}</span>
                <span class="vc-time">{{ v.checkInTime | date:'medium' }}</span>
              </div>
              <div class="vc-right">
                <app-status-chip [status]="v.status"></app-status-chip>
                @if (v.status === 'CheckedIn' && isAdmin()) {
                  <button mat-icon-button color="primary" (click)="checkout(v)" title="Check out">
                    <mat-icon>logout</mat-icon>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
    <a routerLink="register" mat-fab color="primary" class="fab" aria-label="Register visitor">
      <mat-icon>person_add</mat-icon>
    </a>
  `,
  styleUrl: './visitors.scss',
})
export class VisitorListComponent implements OnInit {
  private readonly svc  = inject(VisitorService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly items   = signal<Visitor[]>([]);
  readonly isAdmin = this.auth.isAdmin;

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }
    this.svc.list(sid).subscribe({
      next: r => { this.items.set(r.items ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  checkout(v: Visitor) {
    this.svc.checkout(this.auth.societyId()!, v.id).subscribe({
      next: updated => this.items.update(arr => arr.map(x => x.id === updated.id ? updated : x)),
    });
  }
}
