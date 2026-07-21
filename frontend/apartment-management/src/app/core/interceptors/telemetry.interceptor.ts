import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { TelemetryService, TELEMETRY_RELAY_PATH } from '../services/telemetry.service';
import { createTraceContext } from '../services/trace-context';

/**
 * Stamps every outgoing API request with a W3C `traceparent` header (see
 * requirements/telemetry_observability.md §6) so the backend's OTel instrumentation continues
 * the SAME trace this request started client-side — a click here and the Cosmos query it
 * triggers land in one connected trace, not two disconnected ones.
 *
 * Also reports pure network failures (status 0 — the request never reached the backend at all)
 * to the telemetry relay: that's the one case nothing server-side will ever record, since the
 * backend never saw the request.
 *
 * Must run before {@link errorInterceptor} in the interceptor chain so the traceparent header
 * is already on `req` by the time that interceptor's error handling reads it back off for the
 * network-failure fallback errorId.
 */
export const telemetryInterceptor: HttpInterceptorFn = (req, next) => {
  // Avoid a reporting loop: never instrument calls to the relay endpoint itself.
  if (req.url.includes(TELEMETRY_RELAY_PATH)) return next(req);

  const telemetry = inject(TelemetryService);
  const { traceId, spanId, header } = createTraceContext();
  const traced = req.clone({ setHeaders: { traceparent: header } });

  return next(traced).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 0) {
        telemetry.reportClientEvent({
          traceId,
          spanId,
          name: `web.http.network-error ${req.method} ${req.urlWithParams}`,
          method: req.method,
          url: req.urlWithParams,
          httpStatusCode: 0,
          errorMessage: err.message,
        });
      }
      return throwError(() => err);
    })
  );
};
