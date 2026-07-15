import { TestBed } from '@angular/core/testing';
import { of, EMPTY } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { AuthService } from './core/services/auth.service';
import { PushNotificationService } from './core/services/push-notification.service';

function configureAppComponentTestBed(matches: boolean, role: string = 'SUUser') {
  const authServiceStub = {
    isLoggedIn: () => true,
    user: () => ({ fullName: 'Alice', role }),
    isTenant: () => false,
    apartments: () => [],
    selectedApartmentId: () => null,
    setSelectedApartment: jasmine.createSpy(),
    refreshUserProfile: jasmine.createSpy(),
    logout: jasmine.createSpy(),
  };
  const pushServiceStub = {
    shouldPrompt: false,
    isBrowserSupported: false,
    notificationClicks$: EMPTY,
    enableNotifications: jasmine.createSpy(),
  };
  const breakpointObserverStub = {
    observe: jasmine.createSpy().and.returnValue(of({ matches, breakpoints: {} })),
  };
  const snackBarStub = { open: jasmine.createSpy() };

  TestBed.configureTestingModule({
    imports: [AppComponent, NoopAnimationsModule],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      { provide: AuthService, useValue: authServiceStub },
      { provide: PushNotificationService, useValue: pushServiceStub },
      { provide: BreakpointObserver, useValue: breakpointObserverStub },
      { provide: MatSnackBar, useValue: snackBarStub },
    ],
  });
}

describe('AppComponent', () => {
  it('should create the app', () => {
    configureAppComponentTestBed(false);
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});

describe('AppComponent — responsive side nav', () => {
  function setup(matches: boolean) {
    configureAppComponentTestBed(matches);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('uses a fixed, always-open side nav on desktop widths', () => {
    const component = setup(false);
    expect(component.isMobile()).toBeFalse();
    expect(component.sidenavMode()).toBe('side');
    expect(component.sidenavOpened()).toBeTrue();
  });

  it('uses a toggleable, closed-by-default drawer on mobile widths', () => {
    const component = setup(true);
    expect(component.isMobile()).toBeTrue();
    expect(component.sidenavMode()).toBe('over');
    expect(component.sidenavOpened()).toBeFalse();
  });

  it('toggleMobileMenu opens and closeMobileMenu closes the mobile drawer', () => {
    const component = setup(true);
    component.toggleMobileMenu();
    expect(component.sidenavOpened()).toBeTrue();

    component.closeMobileMenu();
    expect(component.sidenavOpened()).toBeFalse();
  });
});

describe('AppComponent — collapsible side nav', () => {
  function setup(matches: boolean) {
    configureAppComponentTestBed(matches);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => localStorage.removeItem('ourhome-sidenav-collapsed'));
  afterEach(() => localStorage.removeItem('ourhome-sidenav-collapsed'));

  it('starts expanded by default on desktop', () => {
    const component = setup(false);
    expect(component.collapsed()).toBeFalse();
  });

  it('toggleCollapse collapses and expands the desktop rail, persisting the preference', () => {
    const component = setup(false);

    component.toggleCollapse();
    expect(component.collapsed()).toBeTrue();
    expect(localStorage.getItem('ourhome-sidenav-collapsed')).toBe('true');

    component.toggleCollapse();
    expect(component.collapsed()).toBeFalse();
    expect(localStorage.getItem('ourhome-sidenav-collapsed')).toBe('false');
  });

  it('restores a previously-collapsed preference on the next load', () => {
    localStorage.setItem('ourhome-sidenav-collapsed', 'true');
    const component = setup(false);
    expect(component.collapsed()).toBeTrue();
  });

  it('never collapses on mobile, even if a desktop collapse preference was saved', () => {
    localStorage.setItem('ourhome-sidenav-collapsed', 'true');
    const component = setup(true);
    expect(component.collapsed()).toBeFalse();
  });
});

describe('AppComponent — role-based side nav visibility', () => {
  function setupWithRole(role: string) {
    configureAppComponentTestBed(false, role);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('shows Staff to SUAdmin', () => {
    const component = setupWithRole('SUAdmin');
    expect(component.visibleNav().some(item => item.path === '/staff')).toBeTrue();
  });

  it('shows Staff to SUSecurity', () => {
    const component = setupWithRole('SUSecurity');
    expect(component.visibleNav().some(item => item.path === '/staff')).toBeTrue();
  });

  it('hides Staff from SUUser', () => {
    const component = setupWithRole('SUUser');
    expect(component.visibleNav().some(item => item.path === '/staff')).toBeFalse();
  });

  it('hides Staff from HQ roles', () => {
    const component = setupWithRole('HQAdmin');
    expect(component.visibleNav().some(item => item.path === '/staff')).toBeFalse();
  });

  it('shows SOS Alerts to SUAdmin', () => {
    const component = setupWithRole('SUAdmin');
    expect(component.visibleNav().some(item => item.path === '/sos-alerts')).toBeTrue();
  });

  it('shows SOS Alerts to SUSecurity', () => {
    const component = setupWithRole('SUSecurity');
    expect(component.visibleNav().some(item => item.path === '/sos-alerts')).toBeTrue();
  });

  it('hides SOS Alerts from SUUser', () => {
    const component = setupWithRole('SUUser');
    expect(component.visibleNav().some(item => item.path === '/sos-alerts')).toBeFalse();
  });

  it('hides SOS Alerts from HQ roles', () => {
    const component = setupWithRole('HQAdmin');
    expect(component.visibleNav().some(item => item.path === '/sos-alerts')).toBeFalse();
  });

  it('shows Polls to SUAdmin', () => {
    const component = setupWithRole('SUAdmin');
    expect(component.visibleNav().some(item => item.path === '/polls')).toBeTrue();
  });

  it('shows Polls to SUUser', () => {
    const component = setupWithRole('SUUser');
    expect(component.visibleNav().some(item => item.path === '/polls')).toBeTrue();
  });

  it('shows Polls to SUSecurity', () => {
    const component = setupWithRole('SUSecurity');
    expect(component.visibleNav().some(item => item.path === '/polls')).toBeTrue();
  });

  it('hides Polls from HQ roles', () => {
    const component = setupWithRole('HQAdmin');
    expect(component.visibleNav().some(item => item.path === '/polls')).toBeFalse();
  });

  it('shows Society Finances to a non-tenant SUUser', () => {
    const component = setupWithRole('SUUser');
    expect(component.visibleNav().some(item => item.path === '/financial-report/society-summary')).toBeTrue();
  });

  it('hides Society Finances from a tenant, but keeps My Statement', () => {
    configureAppComponentTestBed(false, 'SUUser');
    TestBed.overrideProvider(AuthService, {
      useValue: {
        isLoggedIn: () => true,
        user: () => ({ fullName: 'Alice', role: 'SUUser' }),
        isTenant: () => true,
        apartments: () => [],
        selectedApartmentId: () => null,
        setSelectedApartment: jasmine.createSpy(),
        refreshUserProfile: jasmine.createSpy(),
        logout: jasmine.createSpy(),
      },
    });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.visibleNav().some(item => item.path === '/financial-report/society-summary')).toBeFalse();
    expect(component.visibleNav().some(item => item.path === '/financial-report/my-statement')).toBeTrue();
  });
});
