import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ServiceProviderService } from '../../core/services/service-provider.service';
import { AuthService } from '../../core/services/auth.service';
import { ServiceProvider } from '../../core/models/service-provider.model';

const CATEGORY_ICONS: Record<string, string> = {
  Plumber: 'plumbing', Electrician: 'electrical_services',
  Carpenter: 'carpenter', Painter: 'format_paint',
  Cleaner: 'cleaning_services', AC_Repair: 'ac_unit', Other: 'build',
};

@Component({
  selector: 'app-provider-list',
  standalone: true,
  imports: [RouterLink, DecimalPipe, MatButtonModule, MatIconModule, MatChipsModule,
            PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Service Providers"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (items().length === 0) {
        <app-empty-state icon="build" title="No providers" message="No service providers registered."></app-empty-state>
      } @else {
        <div class="provider-list">
          @for (p of items(); track p.id) {
            <div class="provider-card">
              <div class="pc-icon">
                <span class="material-icons">{{ getIcon(p.category) }}</span>
              </div>
              <div class="pc-info">
                <span class="pc-name">{{ p.name }}</span>
                <span class="pc-cat">{{ p.category }}</span>
                @if (p.rating) {
                  <span class="pc-rating">
                    <span class="material-icons">star</span> {{ p.rating | number:'1.1-1' }}
                  </span>
                }
              </div>
              <a [routerLink]="['/services/request']" [queryParams]="{ providerId: p.id }"
                 mat-stroked-button color="primary">Request</a>
            </div>
          }
        </div>
      }
    </div>
    <a routerLink="request" mat-fab color="primary" class="fab"><mat-icon>add</mat-icon></a>
  `,
  styleUrl: './services.scss',
})
export class ProviderListComponent implements OnInit {
  private readonly svc  = inject(ServiceProviderService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly items   = signal<ServiceProvider[]>([]);

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }
    this.svc.list(sid).subscribe({
      next: r => { this.items.set(r.items ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  getIcon(cat: string) { return CATEGORY_ICONS[cat] ?? 'build'; }
}
