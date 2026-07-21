import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { telemetryInterceptor } from './telemetry.interceptor';
import { TelemetryService } from '../services/telemetry.service';

describe('telemetryInterceptor', () => {
  function setup() {
    const telemetryServiceStub = { reportClientEvent: jasmine.createSpy() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([telemetryInterceptor])),
        provideHttpClientTesting(),
        { provide: TelemetryService, useValue: telemetryServiceStub },
      ],
    });

    return {
      http: TestBed.inject(HttpClient),
      httpMock: TestBed.inject(HttpTestingController),
      telemetryServiceStub,
    };
  }

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('stamps a well-formed traceparent header on the outgoing request', () => {
    const { http, httpMock } = setup();

    http.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');

    expect(req.request.headers.get('traceparent')).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    req.flush({});
  });

  it('generates a different trace ID for each request', () => {
    const { http, httpMock } = setup();

    http.get('/api/one').subscribe();
    http.get('/api/two').subscribe();
    const one = httpMock.expectOne('/api/one').request.headers.get('traceparent');
    const two = httpMock.expectOne('/api/two').request.headers.get('traceparent');

    expect(one).not.toBe(two);
    httpMock.match(() => true).forEach((r) => r.flush({}));
  });

  it('reports a network failure (status 0) to the telemetry relay with the same trace ID', () => {
    const { http, httpMock, telemetryServiceStub } = setup();

    http.get('/api/test').subscribe({ error: () => {} });
    const req = httpMock.expectOne('/api/test');
    const traceparent = req.request.headers.get('traceparent')!;
    const traceId = traceparent.split('-')[1];
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(telemetryServiceStub.reportClientEvent).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({ traceId, httpStatusCode: 0 })
    );
  });

  it('does not report a normal HTTP error response (only true network failures)', () => {
    const { http, httpMock, telemetryServiceStub } = setup();

    http.get('/api/test').subscribe({ error: () => {} });
    httpMock.expectOne('/api/test').flush({ error: 'nope' }, { status: 404, statusText: 'Not Found' });

    expect(telemetryServiceStub.reportClientEvent).not.toHaveBeenCalled();
  });

  it('does not instrument or report calls to the telemetry relay endpoint itself (no reporting loop)', () => {
    const { http, httpMock, telemetryServiceStub } = setup();

    http.post('/api/telemetry/client-events', { events: [] }).subscribe({ error: () => {} });
    const req = httpMock.expectOne('/api/telemetry/client-events');

    expect(req.request.headers.has('traceparent')).toBeFalse();
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(telemetryServiceStub.reportClientEvent).not.toHaveBeenCalled();
  });
});
