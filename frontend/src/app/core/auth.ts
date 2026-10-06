import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {computed, ErrorHandler, inject, Service, signal} from '@angular/core';
import {Router} from '@angular/router';
import {catchError, finalize, Observable, of, shareReplay, tap} from 'rxjs';

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TOKEN_KEY = 'refreshToken';

@Service()
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly accessToken = signal<string | null>(null);
  readonly isLoggedIn = computed(() => this.accessToken() !== null);
  private refreshInFlight: Observable<TokenResponse> | null = null;
  private readonly errorHandler = inject(ErrorHandler);

  getAccessToken(): string | null {
    return this.accessToken();
  }

  login(username: string, password: string): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>('/api/auth/login', {username, password})
      .pipe(tap(response => this.saveTokens(response)));
  }

  refresh(): Observable<TokenResponse> {
    if (!this.refreshInFlight) {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      this.refreshInFlight = this.http
        .post<TokenResponse>('/api/auth/refresh', {refreshToken})
        .pipe(
          tap(response => this.saveTokens(response)),
          finalize(() => (this.refreshInFlight = null)),
          shareReplay(1),
        );
    }
    return this.refreshInFlight;
  }

  restoreSession(): Observable<unknown> {
    if (!localStorage.getItem(REFRESH_TOKEN_KEY)) {
      return of(null);
    }
    return this.refresh().pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.clearTokens();
        }
        return of(null);
      }),
    );
  }

  logout(): void {
    if (!this.accessToken()) {
      this.endSession();
      return;
    }
    this.http
      .post('/api/auth/logout', null)
      .pipe(finalize(() => this.endSession()))
      .subscribe({error: error => this.errorHandler.handleError(error)});
  }

  endSession(): void {
    this.clearTokens();
    this.router.navigate(['/login']);
  }

  private saveTokens(response: TokenResponse): void {
    this.accessToken.set(response.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
  }

  private clearTokens(): void {
    this.accessToken.set(null);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
