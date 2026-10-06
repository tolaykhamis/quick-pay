import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PagedResult, PaymentResponse } from './models';
import { PaymentApi } from './payment-api';

describe('PaymentApi', () => {
  it('lists payments with GET /api/payments and returns the paged result', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(PaymentApi);
    const http = TestBed.inject(HttpTestingController);
    const page: PagedResult<PaymentResponse> = {
      content: [],
      pageNumber: 0,
      pageSize: 20,
      totalElements: 0,
      totalPages: 0,
    };

    let result: PagedResult<PaymentResponse> | undefined;
    api.list().subscribe((value) => (result = value));

    const request = http.expectOne('/api/payments');
    expect(request.request.method).toBe('GET');
    request.flush(page);
    expect(result).toEqual(page);
    http.verify();
  });
});
