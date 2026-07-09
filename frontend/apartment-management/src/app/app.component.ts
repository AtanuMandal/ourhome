import { Component, inject, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { take } from 'rxjs/operators';
import { BreakpointObserver } from '@angular/cdk/layout';
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

const MOBILE_BREAKPOINT = '(max-width: 767px)';

interface SideNavItem { path: string; icon: string; label: string; }

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
  private readonly breakpointObserver = inject(BreakpointObserver);
  readonly push             = inject(PushNotificationService);

  readonly isLoggedIn = this.auth.isLoggedIn;
  readonly user       = this.auth.user;
  readonly isAuthRoute = signal(false);

  readonly isMobile = toSignal(
    this.breakpointObserver.observe(MOBILE_BREAKPOINT).pipe(map(state => state.matches)),
    { initialValue: false }
  );
  readonly sidenavMode = computed<'over' | 'side'>(() => this.isMobile() ? 'over' : 'side');

  private readonly mobileMenuOpen = signal(false);
  readonly sidenavOpened = computed(() => this.isMobile() ? this.mobileMenuOpen() : true);

  toggleMobileMenu() { this.mobileMenuOpen.update(v => !v); }
  closeMobileMenu()  { this.mobileMenuOpen.set(false); }
  onSidenavOpenedChange(opened: boolean) { this.mobileMenuOpen.set(opened); }

  private static readonly NAV_SUUSER: SideNavItem[] = [
    { path: '/dashboard',                        icon: 'home',            label: 'Dashboard' },
    { path: '/my-apartment',                     icon: 'apartment',       label: 'My Apartment' },
    { path: '/apartments',                       icon: 'domain',          label: 'Apartments' },
    { path: '/residents',                        icon: 'people',          label: 'Residents' },
    { path: '/amenities',                        icon: 'event_available', label: 'Amenities' },
    { path: '/complaints',                       icon: 'report_problem',  label: 'Complaints' },
    { path: '/notices',                          icon: 'notifications',   label: 'Notices' },
    { path: '/visitors',                         icon: 'badge',           label: 'Visitors' },
    { path: '/polls',                            icon: 'how_to_vote',     label: 'Polls' },
    { path: '/maintenance',                      icon: 'receipt_long',    label: 'Maintenance' },
    { path: '/financial-report/my-statement',    icon: 'bar_chart',       label: 'My Statement' },
    { path: '/financial-report/society-summary', icon: 'pie_chart',       label: 'Society Finances' },
    { path: '/rewards',                          icon: 'emoji_events',    label: 'Rewards' },
    { path: '/services',                         icon: 'build',           label: 'Services' },
    { path: '/contact-us',                       icon: 'contact_support', label: 'Contact Us' },
    { path: '/profile',                          icon: 'manage_accounts', label: 'My Profile' },
  ];

  private static readonly NAV_SUADMIN: SideNavItem[] = [
    { path: '/dashboard',       icon: 'home',            label: 'Dashboard' },
    { path: '/residents',       icon: 'people',          label: 'Users' },
    { path: '/apartments',      icon: 'domain',          label: 'Apartments' },
    { path: '/amenities',       icon: 'event_available', label: 'Amenities' },
    { path: '/complaints',      icon: 'report_problem',  label: 'Complaints' },
    { path: '/notices',         icon: 'notifications',   label: 'Notices' },
    { path: '/visitors',        icon: 'badge',           label: 'Visitors' },
    { path: '/staff',           icon: 'work',            label: 'Staff' },
    { path: '/sos-alerts',      icon: 'emergency',       label: 'SOS Alerts' },
    { path: '/polls',           icon: 'how_to_vote',     label: 'Polls' },
    { path: '/maintenance',     icon: 'receipt_long',    label: 'Maintenance' },
    { path: '/financial-report',icon: 'bar_chart',       label: 'Financial Reports' },
    { path: '/rewards',         icon: 'emoji_events',    label: 'Rewards' },
    { path: '/services',        icon: 'build',           label: 'Services' },
    { path: '/vendor-payments', icon: 'payments',        label: 'Vendor Payments' },
    { path: '/society',         icon: 'location_city',   label: 'Society' },
    { path: '/contact-us',      icon: 'contact_support', label: 'Contact Us' },
    { path: '/profile',         icon: 'manage_accounts', label: 'My Profile' },
  ];

  private static readonly NAV_SECURITY: SideNavItem[] = [
    { path: '/dashboard',  icon: 'home',            label: 'Dashboard' },
    { path: '/visitors',   icon: 'badge',           label: 'Visitors' },
    { path: '/residents',  icon: 'people',          label: 'Residents' },
    { path: '/staff',      icon: 'work',            label: 'Staff' },
    { path: '/sos-alerts', icon: 'emergency',       label: 'SOS Alerts' },
    { path: '/polls',      icon: 'how_to_vote',     label: 'Polls' },
    { path: '/complaints', icon: 'report_problem',  label: 'Complaints' },
    { path: '/notices',    icon: 'notifications',   label: 'Notices' },
    { path: '/contact-us', icon: 'contact_support', label: 'Contact Us' },
    { path: '/profile',    icon: 'manage_accounts', label: 'My Profile' },
  ];

  // HQAdmin/HQUser are platform-level roles with no access to individual society-level
  // features (residents, billing, visitors, etc.) — their nav is limited to platform management.
  private static readonly NAV_HQ: SideNavItem[] = [
    { path: '/dashboard',    icon: 'home',            label: 'Dashboard' },
    { path: '/hq/societies', icon: 'location_city',   label: 'Societies' },
    { path: '/hq/users',     icon: 'admin_panel_settings', label: 'HQ Users' },
    { path: '/profile',      icon: 'manage_accounts', label: 'My Profile' },
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
        snack.onAction().pipe(take(1)).subscribe(() => this.sw!.activateUpdate().then(() => location.reload()));
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

  readonly visibleNav = computed<SideNavItem[]>(() => {
    switch (this.user()?.role) {
      case 'SUUser':     return AppComponent.NAV_SUUSER;
      case 'SUAdmin':    return AppComponent.NAV_SUADMIN;
      case 'SUSecurity': return AppComponent.NAV_SECURITY;
      default:           return AppComponent.NAV_HQ;
    }
  });

  logout() { this.auth.logout(); }

  readonly userInitials = computed(() => {
    const name = this.user()?.fullName ?? this.user()?.name ?? '';
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
