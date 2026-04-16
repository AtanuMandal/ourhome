import { Component, inject, computed, signal, effect } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';
import { AuthService } from './core/services/auth.service';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgIf, AsyncPipe } from '@angular/common';

interface SideNavItem { path: string; icon: string; label: string; adminOnly?: boolean; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatDividerModule,
    BottomNavComponent, NgIf,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly auth     = inject(AuthService);
  private readonly router   = inject(Router);
  private readonly sw       = inject(SwUpdate, { optional: true });
  private readonly snackBar = inject(MatSnackBar);

  readonly isLoggedIn = this.auth.isLoggedIn;
  readonly isAdmin    = this.auth.isAdmin;
  readonly user       = this.auth.user;
  readonly isAuthRoute = signal(false);

  readonly navItems: SideNavItem[] = [
    { path: '/dashboard',  icon: 'home',                   label: 'Dashboard' },
    { path: '/apartments', icon: 'apartment',               label: 'Apartments' },
    { path: '/residents',  icon: 'people',                  label: 'Residents' },
    { path: '/amenities',  icon: 'event_available',         label: 'Amenities' },
    { path: '/complaints', icon: 'report_problem',          label: 'Complaints' },
    { path: '/notices',    icon: 'notifications',           label: 'Notices' },
    { path: '/visitors',   icon: 'badge',                   label: 'Visitors' },
    { path: '/maintenance', icon: 'receipt_long',            label: 'Maintenance' },
    { path: '/rewards',    icon: 'emoji_events',            label: 'Rewards' },
    { path: '/services',   icon: 'build',                   label: 'Services' },
    { path: '/society',    icon: 'location_city',           label: 'Society', adminOnly: true },
  ];

  constructor() {
    // Track auth routes to hide nav
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.isAuthRoute.set((e.url as string).startsWith('/auth'));
    });

    // Check for SW updates
    if (this.sw?.isEnabled) {
      this.sw.versionUpdates.pipe(
        filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY')
      ).subscribe(() => {
        const snack = this.snackBar.open('New version available!', 'Update', { duration: 10000 });
        snack.onAction().subscribe(() => this.sw!.activateUpdate().then(() => location.reload()));
      });
    }
  }

  visibleNav = computed(() =>
    this.navItems.filter(i => !i.adminOnly || this.isAdmin())
  );

  logout() { this.auth.logout(); }

  userInitials = computed(() => {
    const name = this.user()?.name ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  });
}

