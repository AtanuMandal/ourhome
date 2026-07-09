import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  const auth     = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      let message = 'Something went wrong. Please try again.';

      if (err.status === 0) {
        message = 'Network error — check your connection.';
      } else if (err.status === 401) {
        message = 'Session expired. Please log in again.';
        auth.logout();
      } else if (err.status === 403 && err.error?.errorCode === 'SOCIETY_NOT_ACTIVE') {
        message = 'Your society has been disabled by the platform administrator. Please contact your housing society for assistance.';
        // The account can no longer do anything until the society is re-enabled — clear any
        // stale session so the app doesn't keep retrying requests that will always be rejected.
        if (auth.isLoggedIn()) auth.logout();
      } else if (err.status === 403) {
        message = 'You do not have permission for this action.';
      } else if (err.status === 404) {
        message = 'Resource not found.';
      } else if (err.status >= 500) {
        message = 'Server error. Please try again later.';
      } else if (err.error?.message) {
        message = err.error.message;
      } else if (err.error?.error) {
        message = err.error.error;
      }

      snackBar.open(message, 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });

      return throwError(() => err);
    })
  );
};
