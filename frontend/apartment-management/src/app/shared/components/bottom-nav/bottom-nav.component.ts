import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { MatBadgeModule } from '@angular/material/badge';
import { NgClass } from '@angular/common';

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
      @for (item of navItems; track item.path) {
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
  readonly navItems: NavItem[] = [
    { path: '/dashboard',   icon: 'home',            label: 'Home' },
    { path: '/complaints',  icon: 'report_problem',  label: 'Complaints' },
    { path: '/notices',     icon: 'notifications',   label: 'Notices' },
    { path: '/amenities',   icon: 'event_available', label: 'Bookings' },
    { path: '/fees',        icon: 'account_balance_wallet', label: 'Fees' },
  ];
}
