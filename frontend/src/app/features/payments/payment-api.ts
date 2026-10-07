import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BulkUploadResult, PagedResult, PaymentRequest, PaymentResponse } from './models';

@Service()
export class PaymentApi {
  private readonly http = inject(HttpClient);

  list(pageNumber: number): Observable<PagedResult<PaymentResponse>> {
    return this.http.get<PagedResult<PaymentResponse>>('/api/payments', {
      params: { pageNumber },
    });
  }

  getOne(id: string): Observable<PaymentResponse> {
    return this.http.get<PaymentResponse>(`/api/payments/${id}`);
  }

  create(request: PaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>('/api/payments', request);
  }

  uploadBulk(file: File): Observable<BulkUploadResult> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<BulkUploadResult>('/api/payments/bulk', body);
  }
}
