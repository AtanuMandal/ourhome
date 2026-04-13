import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { UserService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-resident-list',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule,
            PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Residents">
      <div actions>
        @if (isAdmin()) {
          <a routerLink="/residents/new" mat-flat-button color="primary">Add Resident</a>
        }
      </div>
    </app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (items().length === 0) {
        <app-empty-state icon="people" title="No residents" message="No residents found."></app-empty-state>
      } @else {
        <div class="resident-list">
          @for (r of items(); track r.id) {
            <div class="resident-card">
              <div class="avatar">{{ (r.fullName ?? r.name ?? '?')[0] }}</div>
               <div class="rc-info">
                 <span class="rc-name">{{ r.fullName ?? r.name }}</span>
                 <span class="rc-role">{{ r.role }} - {{ r.residentType }}</span>
                 <span class="rc-email">{{ r.email }}</span>
                 @if (r.apartmentId) { <span class="rc-phone">Apartment: {{ r.apartmentId }}</span> }
                 @if (r.phone) { <span class="rc-phone">{{ r.phone }}</span> }
               </div>
             </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './residents.scss',
})
export class ResidentListComponent implements OnInit {
  private readonly userSvc = inject(UserService);
  private readonly auth    = inject(AuthService);

  readonly loading = signal(true);
  readonly items   = signal<any[]>([]);
  readonly isAdmin = this.auth.isAdmin;

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }
    this.userSvc.list(sid).subscribe({
      next: r => { this.items.set(r.items ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
