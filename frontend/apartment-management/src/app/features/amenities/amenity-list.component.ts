import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AmenityService } from '../../core/services/amenity.service';
import { AuthService } from '../../core/services/auth.service';
import { Amenity } from '../../core/models/amenity.model';

const AMENITY_ICONS: Record<string, string> = {
  Pool: 'pool', Gym: 'fitness_center', Clubhouse: 'home_work',
  Garden: 'park', Court: 'sports_tennis', Other: 'place',
};

@Component({
  selector: 'app-amenity-list',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatChipsModule,
            PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Amenities"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (items().length === 0) {
        <app-empty-state icon="event_available" title="No amenities" message="No amenities have been added yet."></app-empty-state>
      } @else {
        <div class="amenity-grid">
          @for (a of items(); track a.id) {
            <div class="amenity-card">
              <div class="ac-icon">
                <span class="material-icons">{{ getIcon(a.type) }}</span>
              </div>
              <div class="ac-info">
                <h3>{{ a.name }}</h3>
                <p>{{ a.description }}</p>
                <div class="ac-hours">
                  <span class="material-icons">schedule</span>
                  {{ a.openTime }} – {{ a.closeTime }}
                </div>
              </div>
              <a [routerLink]="['/amenities/book', a.id]" mat-stroked-button color="primary" class="book-btn">
                Book
              </a>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './amenities.scss',
})
export class AmenityListComponent implements OnInit {
  private readonly svc  = inject(AmenityService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly items   = signal<Amenity[]>([]);

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }
    this.svc.list(sid).subscribe({
      next: r => { this.items.set(Array.isArray(r) ? r : (r as any).items ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  getIcon(type: string) { return AMENITY_ICONS[type] ?? 'place'; }
}
