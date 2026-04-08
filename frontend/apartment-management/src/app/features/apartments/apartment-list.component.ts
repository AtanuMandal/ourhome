import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { Apartment } from '../../core/models/apartment.model';

@Component({
  selector: 'app-apartment-list',
  standalone: true,
  imports: [RouterLink, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
            PageHeaderComponent, StatusChipComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Apartments"></app-page-header>
    <div class="page-content">
      <div class="search-bar">
        <mat-form-field appearance="fill" class="full-width" style="margin-bottom:-8px">
          <mat-icon matPrefix>search</mat-icon>
          <mat-label>Search apartments</mat-label>
          <input matInput [(ngModel)]="search" placeholder="Unit, block, floor...">
        </mat-form-field>
      </div>

      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (filtered().length === 0) {
        <app-empty-state icon="apartment" title="No apartments found" message="Try adjusting your search.">
          @if (isAdmin()) {
            <a routerLink="new" mat-stroked-button color="primary" style="margin-top:16px">Add Apartment</a>
          }
        </app-empty-state>
      } @else {
        <div class="apt-list">
          @for (a of filtered(); track a.id) {
            <a [routerLink]="[a.id]" class="apt-card">
              <div class="apt-unit">{{ a.unitNumber }}</div>
              <div class="apt-info">
                <span class="apt-type">{{ a.type }} · Floor {{ a.floor }}</span>
                @if (a.block) { <span class="apt-block">Block {{ a.block }}</span> }
                <span class="apt-residents">{{ a.residents?.length ?? 0 }} resident(s)</span>
              </div>
              <app-status-chip [status]="a.status"></app-status-chip>
            </a>
          }
        </div>
      }
    </div>
    @if (isAdmin()) {
      <a routerLink="new" mat-fab color="primary" class="fab"><mat-icon>add</mat-icon></a>
    }
  `,
  styleUrl: './apartments.scss',
})
export class ApartmentListComponent implements OnInit {
  private readonly svc  = inject(ApartmentService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly items   = signal<Apartment[]>([]);
  readonly isAdmin = this.auth.isAdmin;
  search = '';

  filtered() {
    const q = this.search.toLowerCase();
    return this.items().filter(a =>
      !q || a.unitNumber.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q) ||
      (a.block ?? '').toLowerCase().includes(q)
    );
  }

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }
    this.svc.list(sid).subscribe({
      next: r => { this.items.set(r.items ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
