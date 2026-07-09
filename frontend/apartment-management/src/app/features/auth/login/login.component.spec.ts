import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

describe('LoginComponent', () => {
  function setup(authOverrides: Partial<Record<string, unknown>> = {}) {
    const store = new Map<string, string>();
    const authServiceStub = {
      getLoginMethod: jasmine.createSpy().and.callFake(() => (store.get('am_login_method') === 'email' ? 'email' : 'phone')),
      setLoginMethod: jasmine.createSpy().and.callFake((m: string) => store.set('am_login_method', m)),
      login: jasmine.createSpy().and.returnValue(of({ requiresSelection: false, token: 't', user: {}, options: [] })),
      requestOtpLogin: jasmine.createSpy().and.returnValue(of({ requiresSelection: false, userId: 'u1', options: [{ userId: 'u1', societyId: 'soc-1', societyName: 'Soc', role: 'SUUser', residentType: 'Owner' }] })),
      verifyOtpLogin: jasmine.createSpy().and.returnValue(of({ accessToken: 't', user: {} })),
      ...authOverrides,
    };

    TestBed.configureTestingModule({
      imports: [LoginComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, authServiceStub };
  }

  it('defaults to phone+OTP login method', () => {
    const { component } = setup();
    expect(component.method()).toBe('phone');
  });

  it('reads a previously cached email preference', () => {
    const { component } = setup({
      getLoginMethod: jasmine.createSpy().and.returnValue('email'),
    });
    expect(component.method()).toBe('email');
  });

  it('switching method persists the preference', () => {
    const { component, authServiceStub } = setup();
    component.switchMethod('email');
    expect(component.method()).toBe('email');
    expect(authServiceStub.setLoginMethod).toHaveBeenCalledWith('email');
  });

  it('requesting phone OTP for a single-account phone moves to the enter-otp step', () => {
    const { component } = setup();
    component.phoneForm.patchValue({ phone: '9876543210' });
    component.requestPhoneOtp();

    expect(component.phoneStep()).toBe('enter-otp');
  });

  it('requesting phone OTP for a multi-account phone moves to the select-account step', () => {
    const { component } = setup({
      requestOtpLogin: jasmine.createSpy().and.returnValue(of({
        requiresSelection: true,
        options: [
          { userId: 'u1', societyId: 'soc-1', societyName: 'Soc A', role: 'SUUser', residentType: 'Owner' },
          { userId: 'u2', societyId: 'soc-2', societyName: 'Soc B', role: 'SUUser', residentType: 'Tenant' },
        ],
      })),
    });
    component.phoneForm.patchValue({ phone: '9876543210' });
    component.requestPhoneOtp();

    expect(component.phoneStep()).toBe('select-account');
    expect(component.options().length).toBe(2);
  });

  it('verifying an invalid OTP surfaces an error and stays on the page', () => {
    const { component } = setup({
      verifyOtpLogin: jasmine.createSpy().and.returnValue(throwError(() => new Error('invalid'))),
    });
    component.phoneForm.patchValue({ phone: '9876543210' });
    component.requestPhoneOtp();
    component.phoneForm.patchValue({ otp: '000000' });
    component.verifyPhoneOtp();

    expect(component.error()).toContain('invalid');
  });

  it('logging in as a user of a disabled society shows a specific message', () => {
    const { component } = setup({
      login: jasmine.createSpy().and.returnValue(throwError(() => ({
        status: 403,
        error: { error: 'Your society has been disabled.', errorCode: 'SOCIETY_NOT_ACTIVE' },
      }))),
    });
    component.form.patchValue({ email: 'alice@gv.com', password: 'password123' });
    component.submit();

    expect(component.error()).toContain('disabled');
  });

  it('verifying OTP as a user of a disabled society shows a specific message', () => {
    const { component } = setup({
      verifyOtpLogin: jasmine.createSpy().and.returnValue(throwError(() => ({
        status: 403,
        error: { error: 'Your society has been disabled.', errorCode: 'SOCIETY_NOT_ACTIVE' },
      }))),
    });
    component.phoneForm.patchValue({ phone: '9876543210' });
    component.requestPhoneOtp();
    component.phoneForm.patchValue({ otp: '000000' });
    component.verifyPhoneOtp();

    expect(component.error()).toContain('disabled');
  });
});
