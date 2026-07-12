import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { notTenantGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('notTenantGuard', () => {
  function setup(isLoggedIn: boolean, isTenant: boolean) {
    const authServiceStub = {
      isLoggedIn: () => isLoggedIn,
      isTenant: () => isTenant,
    };
    const navigateSpy = jasmine.createSpy('navigate');

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceStub },
        { provide: Router, useValue: { navigate: navigateSpy } },
      ],
    });

    return { navigateSpy };
  }

  function runGuard(): boolean {
    return TestBed.runInInjectionContext(() => notTenantGuard({} as any, {} as any)) as boolean;
  }

  it('redirects to login when not authenticated', () => {
    const { navigateSpy } = setup(false, false);

    expect(runGuard()).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
  });

  it('redirects a tenant to the dashboard', () => {
    const { navigateSpy } = setup(true, true);

    expect(runGuard()).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('allows a non-tenant resident through', () => {
    const { navigateSpy } = setup(true, false);

    expect(runGuard()).toBeTrue();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
