import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { traceIdFromHeader } from '../services/trace-context';

/**
 * The errorId every error response carries — see requirements/telemetry_observability.md
 * "The errorId Contract". Prefers the server's own errorId (present whenever the backend
 * actually responded, since it's the trace ID of that exact request); falls back to the
 * traceparent header this request was sent with only for network failures (status 0), where
 * the backend never got a chance to respond with one at all.
 */
function extractErrorId(err: HttpErrorResponse, req: HttpRequest<unknown>): string | null {
  const serverErrorId = err.error?.errorId;
  if (typeof serverErrorId === 'string' && serverErrorId.length > 0) return serverErrorId;
  if (err.status === 0) return traceIdFromHeader(req.headers.get('traceparent'));
  return null;
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  const auth     = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      let message = 'Something went wrong. Please try again.';
      // Shown only for unexpected/unattributable failures — a handled 401/403/404 already has
      // a specific, actionable message and doesn't need a support-escalation affordance.
      let showErrorId = true;

      if (err.status === 0) {
        message = 'Network error — check your connection.';
      } else if (err.status === 401) {
        message = 'Session expired. Please log in again.';
        showErrorId = false;
        auth.logout();
      } else if (err.status === 403 && err.error?.errorCode === 'SOCIETY_NOT_ACTIVE') {
        message = 'Your society has been disabled by the platform administrator. Please contact your housing society for assistance.';
        showErrorId = false;
        // The account can no longer do anything until the society is re-enabled — clear any
        // stale session so the app doesn't keep retrying requests that will always be rejected.
        if (auth.isLoggedIn()) auth.logout();
      } else if (err.status === 403) {
        message = 'You do not have permission for this action.';
        showErrorId = false;
      } else if (err.status === 404) {
        message = 'Resource not found.';
        showErrorId = false;
      } else if (err.status >= 500) {
        message = 'Server error. Please try again later.';
      } else if (err.error?.message) {
        message = err.error.message;
      } else if (err.error?.error) {
        message = err.error.error;
      }

      const errorId = showErrorId ? extractErrorId(err, req) : null;
      const ref = snackBar.open(message, errorId ? 'Copy error ID' : 'Dismiss', {
        duration: errorId ? 8000 : 4000,
        panelClass: ['error-snackbar'],
      });
      if (errorId) {
        // Clipboard access can reject (unfocused document, denied permission, insecure
        // context) — must be caught, not left as an unhandled promise rejection.
        ref.onAction().subscribe(() => {
          navigator.clipboard?.writeText(errorId).catch(() => {});
        });
      }

      return throwError(() => err);
    })
  );
};
