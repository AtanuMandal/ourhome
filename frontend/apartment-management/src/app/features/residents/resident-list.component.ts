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
    <app-page-header title="Residents"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (items().length === 0) {
        <app-empty-state icon="people" title="No residents" message="No residents found.">
          @if (isAdmin()) {
            <a routerLink="new" mat-stroked-button color="primary" style="margin-top:16px">Add Resident</a>
          }
        </app-empty-state>
      } @else {
        <div class="resident-list">
          @for (r of items(); track r.id) {
            <a [routerLink]="[r.id]" class="resident-card">
              <div class="avatar">{{ (r.fullName ?? r.name ?? '?')[0] }}</div>
                <div class="rc-info">
                  <span class="rc-name">{{ r.fullName ?? r.name }}</span>
                  <span class="rc-email">Apartments: {{ apartmentNamesFor(r) }}</span>
                  @if (isAdmin() && r.email) { <span class="rc-email">{{ r.email }}</span> }
                  @if (isAdmin() && r.phone) { <span class="rc-phone">{{ r.phone }}</span> }
                </div>
              </a>
          }
        </div>
      }
    </div>
    @if (isAdmin()) {
      <a routerLink="new" mat-fab color="primary" class="fab"><mat-icon>add</mat-icon></a>
    }
  `,
  styleUrl: './residents.scss',
})
export class ResidentListComponent implements OnInit {
  private readonly userSvc = inject(UserService);
  private readonly auth    = inject(AuthService);

  readonly loading = signal(true);
  readonly items   = signal<User[]>([]);
  readonly isAdmin = this.auth.isAdmin;

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }
    this.userSvc.list(sid).subscribe({
      next: residents => {
        this.items.set(residents.items ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  apartmentNamesFor(resident: User) {
    if (!resident.apartments?.length) return 'Not assigned';
    return resident.apartments.map(apartment => `${apartment.name} (${apartment.residentType})`).join(', ');
  }
}
