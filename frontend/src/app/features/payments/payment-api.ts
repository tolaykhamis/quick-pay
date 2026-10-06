import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResult, PaymentResponse } from './models';

@Service()
export class PaymentApi {
  private readonly http = inject(HttpClient);

  list(): Observable<PagedResult<PaymentResponse>> {
    return this.http.get<PagedResult<PaymentResponse>>('/api/payments');
  }
}
