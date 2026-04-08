import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { UserService } from '../../core/services/apartment.service';
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { Apartment } from '../../core/models/apartment.model';

@Component({
  selector: 'app-resident-list',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule,
            PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Residents"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (residents().length === 0) {
        <app-empty-state icon="people" title="No residents" message="No residents found."></app-empty-state>
      } @else {
        <div class="resident-list">
          @for (r of residents(); track r.userId) {
            <div class="resident-card">
              <div class="avatar">{{ r.name[0] }}</div>
              <div class="rc-info">
                <span class="rc-name">{{ r.name }}</span>
                <span class="rc-email">{{ r.email }}</span>
                @if (r.phone) { <span class="rc-phone">{{ r.phone }}</span> }
              </div>
              @if (r.isOwner) { <span class="owner-tag">Owner</span> }
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './residents.scss',
})
export class ResidentListComponent implements OnInit {
  private readonly aptSvc = inject(ApartmentService);
  private readonly auth   = inject(AuthService);

  readonly loading   = signal(true);
  readonly residents = signal<Array<{userId:string;name:string;email:string;phone?:string;isOwner:boolean}>>([]);

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }
    this.aptSvc.list(sid).subscribe({
      next: r => {
        const res = (r.items ?? []).flatMap(a => a.residents ?? []);
        this.residents.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
