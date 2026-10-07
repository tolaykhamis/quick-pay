import { HttpClient, HttpContext, HttpContextToken, HttpErrorResponse } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { finalize, timeout } from 'rxjs';

export const SKIP_NETWORK_ERROR_HANDLING = new HttpContextToken<boolean>(() => false);

@Service()
export class Connectivity {
  private readonly http = inject(HttpClient);
  private readonly offline = signal(false);
  readonly isOffline = this.offline.asReadonly();
  private readonly retrying = signal(false);
  readonly isRetrying = this.retrying.asReadonly();

  show(): void {
    this.offline.set(true);
  }

  retry(): void {
    if (this.retrying()) return;
    this.retrying.set(true);

    this.http
      .get('/api/payments', {
        params: { pageSize: 1 },
        context: new HttpContext().set(SKIP_NETWORK_ERROR_HANDLING, true),
      })
      .pipe(
        timeout(5000),
        finalize(() => this.retrying.set(false)),
      )
      .subscribe({
        next: () => this.offline.set(false),
        error: (e: unknown) => {
          if (e instanceof HttpErrorResponse && e.status !== 0) this.offline.set(false);
        },
      });
  }
}
