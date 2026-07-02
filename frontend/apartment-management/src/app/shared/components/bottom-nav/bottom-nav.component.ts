import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { MatBadgeModule } from '@angular/material/badge';
import { NgClass } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem { path: string; icon: string; label: string; badge?: number; }

// One definition per destination — reused across role configs below.
const N = {
  home:        { path: '/dashboard',    icon: 'home',            label: 'Home' },
  myApt:       { path: '/my-apartment', icon: 'apartment',       label: 'My Apt' },
  users:       { path: '/residents',    icon: 'people',          label: 'Users' },
  residents:   { path: '/residents',    icon: 'people',          label: 'Residents' },
  apartments:  { path: '/apartments',   icon: 'domain',          label: 'Apartments' },
  complaints:  { path: '/complaints',   icon: 'report_problem',  label: 'Complaints' },
  notices:     { path: '/notices',      icon: 'notifications',   label: 'Notices' },
  visitors:    { path: '/visitors',     icon: 'badge',           label: 'Visitors' },
  maintenance: { path: '/maintenance',  icon: 'receipt_long',    label: 'Maintenance' },
  bookings:    { path: '/amenities',    icon: 'event_available', label: 'Bookings' },
} satisfies Record<string, NavItem>;

// Role → 5-item bottom-nav list; 'default' covers HQAdmin / HQUser.
const ROLE_NAV: Partial<Record<string, NavItem[]>> = {
  SUUser:     [N.home, N.visitors,   N.notices,    N.complaints, N.maintenance],
  SUAdmin:    [N.home, N.users,      N.apartments, N.complaints, N.maintenance],
  SUSecurity: [N.home, N.visitors,   N.residents,  N.notices,    N.complaints ],
  default:    [N.home, N.complaints, N.notices,    N.bookings,   N.maintenance],
};

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

  readonly navItems = computed<NavItem[]>(() =>
    ROLE_NAV[this.auth.user()?.role ?? ''] ?? ROLE_NAV['default']!
  );
}
