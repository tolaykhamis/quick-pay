import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Connectivity, SKIP_NETWORK_ERROR_HANDLING } from './connectivity';
import { networkErrorInterceptor } from './network-error-interceptor';

describe('networkErrorInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let connectivity: Connectivity;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([networkErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    connectivity = TestBed.inject(Connectivity);
  });

  afterEach(() => http.verify());

  it('shows the offline modal on a status 0 failure and still reports the error', () => {
    let status: number | undefined;
    client.get('/api/x').subscribe({ error: (e) => (status = e.status) });

    http.expectOne('/api/x').error(new ProgressEvent('error'));

    expect(connectivity.isOffline()).toBe(true);
    expect(status).toBe(0);
  });

  it('does not show the modal for an HTTP error status', () => {
    client.get('/api/x').subscribe({ error: () => undefined });

    http.expectOne('/api/x').flush('boom', { status: 500, statusText: 'Server Error' });

    expect(connectivity.isOffline()).toBe(false);
  });

  it('does not show the modal when the request carries the skip flag', () => {
    const context = new HttpContext().set(SKIP_NETWORK_ERROR_HANDLING, true);
    client.get('/api/x', { context }).subscribe({ error: () => undefined });

    http.expectOne('/api/x').error(new ProgressEvent('error'));

    expect(connectivity.isOffline()).toBe(false);
  });

  it('does not loop: a failed retry leaves the modal open with no extra request', () => {
    connectivity.show();
    connectivity.retry();

    http.expectOne('/api/payments?pageSize=1').error(new ProgressEvent('error'));

    expect(connectivity.isOffline()).toBe(true);
    http.expectNone('/api/payments?pageSize=1');
  });
});
