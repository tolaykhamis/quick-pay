import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { PagedResult, PaymentResponse } from './models';
import { PaymentApi } from './payment-api';

@Component({
  imports: [DatePipe],
  selector: 'app-payment-list',
  styleUrl: './payment-list.css',
  templateUrl: './payment-list.html',
})
export class PaymentList implements OnInit {
  private readonly paymentApi = inject(PaymentApi);

  protected readonly page = signal<PagedResult<PaymentResponse> | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly isLoading = signal(true);

  ngOnInit(): void {
    this.paymentApi.list().subscribe({
      next: (result) => {
        this.page.set(result);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.messageFor(error));
        this.isLoading.set(false);
      },
    });
  }

  private messageFor(error: HttpErrorResponse): string {
    if (error.status === 403) {
      return 'You do not have permission to view payments.';
    }
    if (error.status === 0) {
      return 'Could not reach the server.';
    }
    return 'Could not load payments. Please try again.';
  }
}
