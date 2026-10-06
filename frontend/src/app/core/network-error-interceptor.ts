import {HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {catchError, throwError} from 'rxjs';
import {Connectivity, SKIP_NETWORK_ERROR_HANDLING} from './connectivity';

export const networkErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const connectivity = inject(Connectivity);

  return next(request).pipe(
    catchError((error: unknown) => {
      const isNetworkError = error instanceof HttpErrorResponse && error.status === 0;
      if (isNetworkError && !request.context.get(SKIP_NETWORK_ERROR_HANDLING)) {
        connectivity.show();
      }
      return throwError(() => error);
    }),
  );
};
