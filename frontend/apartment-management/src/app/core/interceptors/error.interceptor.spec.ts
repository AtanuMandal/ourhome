import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';

describe('errorInterceptor', () => {
  function setup(authOverrides: Partial<Record<string, unknown>> = {}) {
    const authServiceStub = {
      logout: jasmine.createSpy(),
      isLoggedIn: jasmine.createSpy().and.returnValue(true),
      ...authOverrides,
    };
    // onAction() must return an Observable so the interceptor's .subscribe() call is valid;
    // it never actually fires here since nothing in these tests simulates a user click.
    const snackBarStub = {
      open: jasmine.createSpy().and.returnValue({ onAction: () => of(undefined) }),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
      ],
    });

    return {
      http: TestBed.inject(HttpClient),
      httpMock: TestBed.inject(HttpTestingController),
      authServiceStub,
      snackBarStub,
    };
  }

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('logs the user out on a 401', () => {
    const { http, httpMock, authServiceStub } = setup();

    http.get('/api/test').subscribe({ error: () => {} });
    httpMock.expectOne('/api/test').flush({ error: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(authServiceStub.logout).toHaveBeenCalled();
  });

  it('does not log out on a generic 403', () => {
    const { http, httpMock, authServiceStub } = setup();

    http.get('/api/test').subscribe({ error: () => {} });
    httpMock.expectOne('/api/test').flush({ error: 'forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(authServiceStub.logout).not.toHaveBeenCalled();
  });

  it('logs out a currently-logged-in user when their society is disabled mid-session', () => {
    const { http, httpMock, authServiceStub } = setup();

    http.get('/api/test').subscribe({ error: () => {} });
    httpMock.expectOne('/api/test').flush(
      { error: 'Your society has been disabled.', errorCode: 'SOCIETY_NOT_ACTIVE' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(authServiceStub.logout).toHaveBeenCalled();
  });

  it('does not attempt logout for SOCIETY_NOT_ACTIVE when not currently logged in (e.g. during login)', () => {
    const { http, httpMock, authServiceStub } = setup({ isLoggedIn: jasmine.createSpy().and.returnValue(false) });

    http.get('/api/test').subscribe({ error: () => {} });
    httpMock.expectOne('/api/test').flush(
      { error: 'Your society has been disabled.', errorCode: 'SOCIETY_NOT_ACTIVE' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(authServiceStub.logout).not.toHaveBeenCalled();
  });

  // ─── errorId surfacing (requirements/telemetry_observability.md "The errorId Contract") ───

  it('offers "Copy error ID" for a 500 that carries a server errorId', () => {
    const { http, httpMock, snackBarStub } = setup();

    http.get('/api/test').subscribe({ error: () => {} });
    httpMock.expectOne('/api/test').flush(
      { error: 'boom', errorCode: 'INTERNAL_ERROR', errorId: '4bf92f3577b34da6a3ce929d0e0e4736' },
      { status: 500, statusText: 'Internal Server Error' }
    );

    expect(snackBarStub.open).toHaveBeenCalledWith(
      'Server error. Please try again later.',
      'Copy error ID',
      jasmine.any(Object)
    );
  });

  it('falls back to "Dismiss" for a 500 with no errorId in the payload', () => {
    const { http, httpMock, snackBarStub } = setup();

    http.get('/api/test').subscribe({ error: () => {} });
    httpMock.expectOne('/api/test').flush({ error: 'boom' }, { status: 500, statusText: 'Internal Server Error' });

    expect(snackBarStub.open).toHaveBeenCalledWith(
      'Server error. Please try again later.',
      'Dismiss',
      jasmine.any(Object)
    );
  });

  it('does not offer "Copy error ID" for a handled 404, even if one is present', () => {
    const { http, httpMock, snackBarStub } = setup();

    http.get('/api/test').subscribe({ error: () => {} });
    httpMock.expectOne('/api/test').flush(
      { error: 'not found', errorId: '4bf92f3577b34da6a3ce929d0e0e4736' },
      { status: 404, statusText: 'Not Found' }
    );

    expect(snackBarStub.open).toHaveBeenCalledWith('Resource not found.', 'Dismiss', jasmine.any(Object));
  });

  it('falls back to the traceparent header for a network error (status 0, no server response)', () => {
    const { http, httpMock, snackBarStub } = setup();

    // Simulates telemetryInterceptor having already stamped this header (it runs before
    // errorInterceptor in the real chain — see app.config.ts) by setting it directly on the
    // outgoing request, since this spec only registers errorInterceptor in isolation.
    http
      .get('/api/test', { headers: { traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' } })
      .subscribe({ error: () => {} });
    const testReq = httpMock.expectOne('/api/test');
    testReq.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(snackBarStub.open).toHaveBeenCalledWith(
      'Network error — check your connection.',
      'Copy error ID',
      jasmine.any(Object)
    );
  });
});
