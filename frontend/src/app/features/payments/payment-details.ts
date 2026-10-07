import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { messageFor } from '../../core/api-error';
import { PaymentResponse } from './models';
import { PaymentApi } from './payment-api';

@Component({
  imports: [DatePipe, RouterLink],
  selector: 'app-payment-details',
  styleUrl: './payment-details.css',
  templateUrl: './payment-details.html',
})
export class PaymentDetails implements OnInit {
  private readonly paymentApi = inject(PaymentApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly payment = signal<PaymentResponse | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly isLoading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.paymentApi.getOne(id).subscribe({
      next: (result) => {
        this.payment.set(result);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(error.status === 404 ? 'Payment not found' : messageFor(error));
        this.isLoading.set(false);
      },
    });
  }
}
