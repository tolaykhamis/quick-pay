import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { Auth } from './auth';

function withBearer(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const path = request.url.split('?')[0];
  const isPublicAuthCall = path === '/api/auth/login' || path === '/api/auth/refresh';
  const isProtectedApiCall = path.startsWith('/api/') && !isPublicAuthCall;
  if (!isProtectedApiCall) {
    return next(request);
  }

  const auth = inject(Auth);
  const token = auth.getAccessToken();
  const requestToSend = token ? withBearer(request, token) : request;

  return next(requestToSend).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !token) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        catchError((refreshError: HttpErrorResponse) => {
          if (refreshError.status === 401) {
            auth.endSession();
          }
          return throwError(() => refreshError);
        }),
        switchMap((response) => next(withBearer(request, response.accessToken))),
      );
    }),
  );
};
