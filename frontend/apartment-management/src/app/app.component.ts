import { Component, inject, computed, signal } from '@angular/core';
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
import { PushNotificationService } from './core/services/push-notification.service';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { MatSnackBar } from '@angular/material/snack-bar';

interface SideNavItem { path: string; icon: string; label: string; adminOnly?: boolean; securityHidden?: boolean; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatDividerModule,
    BottomNavComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly auth     = inject(AuthService);
  private readonly router   = inject(Router);
  private readonly sw       = inject(SwUpdate, { optional: true });
  private readonly snackBar = inject(MatSnackBar);
  readonly push             = inject(PushNotificationService);

  readonly isLoggedIn    = this.auth.isLoggedIn;
  readonly isAdmin       = this.auth.isAdmin;
  readonly isSecurity    = this.auth.isSecurity;
  readonly user          = this.auth.user;
  readonly isAuthRoute = signal(false);

  readonly navItems: SideNavItem[] = [
    { path: '/dashboard',       icon: 'home',           label: 'Dashboard' },
    { path: '/apartments',      icon: 'apartment',      label: 'Apartments',     securityHidden: true },
    { path: '/residents',       icon: 'people',         label: 'Residents' },
    { path: '/amenities',       icon: 'event_available',label: 'Amenities',      securityHidden: true },
    { path: '/complaints',      icon: 'report_problem', label: 'Complaints',     securityHidden: true },
    { path: '/notices',         icon: 'notifications',  label: 'Notices',        securityHidden: true },
    { path: '/visitors',        icon: 'badge',          label: 'Visitors' },
    { path: '/maintenance',     icon: 'receipt_long',   label: 'Maintenance',    securityHidden: true },
    { path: '/rewards',         icon: 'emoji_events',   label: 'Rewards',        securityHidden: true },
    { path: '/services',        icon: 'build',          label: 'Services',       securityHidden: true },
    { path: '/vendor-payments', icon: 'payments',       label: 'Vendor Payments',adminOnly: true },
    { path: '/society',         icon: 'location_city',  label: 'Society',        adminOnly: true },
    { path: '/profile',         icon: 'manage_accounts',label: 'My Profile' },
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

    // Navigate to approve/deny URL when a notification action is clicked
    this.push.notificationClicks$.subscribe(({ action, notification }) => {
      const data = notification.data as Record<string, string> | undefined;
      const url = action === 'approve' ? data?.['approveUrl']
                : action === 'deny'    ? data?.['denyUrl']
                : data?.['approveUrl'];
      if (url) this.router.navigateByUrl(url);
    });
  }

  visibleNav = computed(() =>
    this.navItems.filter(i => {
      if (i.adminOnly && !this.isAdmin()) return false;
      if (i.securityHidden && this.isSecurity()) return false;
      return true;
    })
  );

  logout() { this.auth.logout(); }

  userInitials = computed(() => {
    const name = this.user()?.name ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  });

  /** Called from the notification-permission banner button — satisfies user gesture requirement. */
  async enableNotifications() {
    const result = await this.push.enableNotifications();
    if (result === 'granted') {
      this.snackBar.open('Notifications enabled!', '', { duration: 3000 });
    } else if (result === 'denied') {
      this.snackBar.open('Notifications blocked. Enable them in browser settings.', '', { duration: 5000 });
    }
  }
}
