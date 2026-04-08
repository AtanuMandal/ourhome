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
      } else if (err.status === 403) {
        message = 'You do not have permission for this action.';
      } else if (err.status === 404) {
        message = 'Resource not found.';
      } else if (err.status >= 500) {
        message = 'Server error. Please try again later.';
      } else if (err.error?.message) {
        message = err.error.message;
      }

      snackBar.open(message, 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });

      return throwError(() => err);
    })
  );
};
