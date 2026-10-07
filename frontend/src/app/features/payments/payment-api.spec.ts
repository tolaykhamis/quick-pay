import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BulkUploadResult, PagedResult, PaymentRequest, PaymentResponse } from './models';
import { PaymentApi } from './payment-api';

describe('PaymentApi', () => {
  it('lists the requested page with GET /api/payments and returns the paged result', () => {
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
    api.list(3).subscribe((value) => (result = value));

    const request = http.expectOne('/api/payments?pageNumber=3');
    expect(request.request.method).toBe('GET');
    request.flush(page);
    expect(result).toEqual(page);
    http.verify();
  });

  it('gets one payment with GET /api/payments/{id}', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(PaymentApi);
    const http = TestBed.inject(HttpTestingController);
    const payment = { id: 5 } as PaymentResponse;

    let result: PaymentResponse | undefined;
    api.getOne('5').subscribe((value) => (result = value));

    const request = http.expectOne('/api/payments/5');
    expect(request.request.method).toBe('GET');
    request.flush(payment);
    expect(result).toEqual(payment);
    http.verify();
  });

  it('creates a payment with POST /api/payments and returns the created payment', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(PaymentApi);
    const http = TestBed.inject(HttpTestingController);
    const body: PaymentRequest = {
      senderAccount: 'JO111',
      receiverAccount: 'JO222',
      amount: 10,
      currency: 'JOD',
      notes: '',
      creditorName: 'Ali Hassan',
    };
    const created = { id: 9 } as PaymentResponse;

    let result: PaymentResponse | undefined;
    api.create(body).subscribe((value) => (result = value));

    const request = http.expectOne('/api/payments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(created, { status: 201, statusText: 'Created' });
    expect(result).toEqual(created);
    http.verify();
  });

  it('uploads the file as multipart form data without setting a Content-Type header', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(PaymentApi);
    const http = TestBed.inject(HttpTestingController);
    const file = new File(['a,b'], 'payments.csv', { type: 'text/csv' });
    const outcome: BulkUploadResult = {
      failures: [],
      validRows: [],
      successCount: 0,
      failureCount: 0,
    };

    let result: BulkUploadResult | undefined;
    api.uploadBulk(file).subscribe((value) => (result = value));

    const request = http.expectOne('/api/payments/bulk');
    const body = request.request.body as FormData;
    expect(request.request.method).toBe('POST');
    expect(body instanceof FormData).toBe(true);
    expect((body.get('file') as File).name).toBe('payments.csv');
    expect(body.has('metadata')).toBe(false);
    expect(request.request.headers.has('Content-Type')).toBe(false);
    request.flush(outcome);
    expect(result).toEqual(outcome);
    http.verify();
  });
});
