import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { messageFor } from '../../core/api-error';
import { PagedResult, PaymentResponse } from './models';
import { PaymentApi } from './payment-api';

@Component({
  imports: [DatePipe, RouterLink],
  selector: 'app-payment-list',
  styleUrl: './payment-list.css',
  templateUrl: './payment-list.html',
})
export class PaymentList implements OnInit {
  private readonly paymentApi = inject(PaymentApi);
  private readonly router = inject(Router);

  protected readonly page = signal<PagedResult<PaymentResponse> | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly isLoading = signal(true);

  ngOnInit(): void {
    this.goToPage(0);
  }

  protected goToPage(pageNumber: number): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.paymentApi.list(pageNumber).subscribe({
      next: (result) => {
        this.page.set(result);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(messageFor(error));
        this.isLoading.set(false);
      },
    });
  }

  protected open(id: number): void {
    this.router.navigate(['/payments', id]);
  }
}
