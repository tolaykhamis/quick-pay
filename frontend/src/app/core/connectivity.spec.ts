import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Connectivity, SKIP_NETWORK_ERROR_HANDLING } from './connectivity';

describe('Connectivity', () => {
  let connectivity: Connectivity;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    connectivity = TestBed.inject(Connectivity);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts online and goes offline on show()', () => {
    expect(connectivity.isOffline()).toBe(false);

    connectivity.show();

    expect(connectivity.isOffline()).toBe(true);
  });

  it('retries with GET /api/payments?pageSize=1, flagged to skip the network-error interceptor', () => {
    connectivity.show();
    connectivity.retry();

    const request = http.expectOne('/api/payments?pageSize=1');
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(SKIP_NETWORK_ERROR_HANDLING)).toBe(true);
    request.flush({});
  });

  it('closes the modal when the retry succeeds', () => {
    connectivity.show();
    connectivity.retry();

    http.expectOne('/api/payments?pageSize=1').flush({});

    expect(connectivity.isOffline()).toBe(false);
  });

  it('closes the modal on an HTTP error status, because the server answered', () => {
    connectivity.show();
    connectivity.retry();

    http
      .expectOne('/api/payments?pageSize=1')
      .flush('forbidden', { status: 403, statusText: 'Forbidden' });

    expect(connectivity.isOffline()).toBe(false);
  });

  it('keeps the modal open when the retry fails with status 0', () => {
    connectivity.show();
    connectivity.retry();

    http.expectOne('/api/payments?pageSize=1').error(new ProgressEvent('error'));

    expect(connectivity.isOffline()).toBe(true);
    expect(connectivity.isRetrying()).toBe(false);
  });

  it('ignores a second retry while one is already running', () => {
    connectivity.show();
    connectivity.retry();
    connectivity.retry();

    const request = http.expectOne('/api/payments?pageSize=1');
    expect(connectivity.isRetrying()).toBe(true);
    request.flush({});
  });
});
