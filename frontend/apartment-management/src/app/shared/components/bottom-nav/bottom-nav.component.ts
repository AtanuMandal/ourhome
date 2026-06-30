import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { MatBadgeModule } from '@angular/material/badge';
import { NgClass } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  badge?: number;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatRippleModule, MatBadgeModule, NgClass],
  template: `
    <nav class="bottom-nav" role="navigation" aria-label="Main navigation">
      @for (item of navItems(); track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="active"
          class="nav-item"
          matRipple
          [matRippleCentered]="true"
          [attr.aria-label]="item.label"
        >
          <span class="nav-icon">
            @if (item.badge && item.badge > 0) {
              <span class="material-icons" [matBadge]="item.badge" matBadgeSize="small" matBadgeColor="warn">
                {{ item.icon }}
              </span>
            } @else {
              <span class="material-icons">{{ item.icon }}</span>
            }
          </span>
          <span class="nav-label">{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  private readonly auth = inject(AuthService);

  readonly navItems = computed<NavItem[]>(() => {
    const role = this.auth.user()?.role;

    if (role === 'SUUser') {
      return [
        { path: '/dashboard',    icon: 'home',           label: 'Home' },
        { path: '/my-apartment', icon: 'apartment',      label: 'My Apt' },
        { path: '/notices',      icon: 'notifications',  label: 'Notices' },
        { path: '/complaints',   icon: 'report_problem', label: 'Complaints' },
        { path: '/maintenance',  icon: 'receipt_long',   label: 'Maintenance' },
      ];
    }

    if (role === 'SUAdmin') {
      return [
        { path: '/dashboard',   icon: 'home',           label: 'Home' },
        { path: '/residents',   icon: 'people',         label: 'Users' },
        { path: '/apartments',  icon: 'domain',         label: 'Apartments' },
        { path: '/complaints',  icon: 'report_problem', label: 'Complaints' },
        { path: '/maintenance', icon: 'receipt_long',   label: 'Maintenance' },
      ];
    }

    if (role === 'SUSecurity') {
      return [
        { path: '/dashboard',  icon: 'home',           label: 'Home' },
        { path: '/visitors',   icon: 'badge',          label: 'Visitors' },
        { path: '/residents',  icon: 'people',         label: 'Residents' },
        { path: '/notices',    icon: 'notifications',  label: 'Notices' },
        { path: '/complaints', icon: 'report_problem', label: 'Complaints' },
      ];
    }

    // HQAdmin, HQUser
    return [
      { path: '/dashboard',   icon: 'home',            label: 'Home' },
      { path: '/complaints',  icon: 'report_problem',  label: 'Complaints' },
      { path: '/notices',     icon: 'notifications',   label: 'Notices' },
      { path: '/amenities',   icon: 'event_available', label: 'Bookings' },
      { path: '/maintenance', icon: 'receipt_long',    label: 'Maintenance' },
    ];
  });
}
