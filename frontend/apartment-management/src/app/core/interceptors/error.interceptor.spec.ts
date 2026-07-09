import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';

describe('errorInterceptor', () => {
  function setup(authOverrides: Partial<Record<string, unknown>> = {}) {
    const authServiceStub = {
      logout: jasmine.createSpy(),
      isLoggedIn: jasmine.createSpy().and.returnValue(true),
      ...authOverrides,
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    return {
      http: TestBed.inject(HttpClient),
      httpMock: TestBed.inject(HttpTestingController),
      authServiceStub,
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
});
