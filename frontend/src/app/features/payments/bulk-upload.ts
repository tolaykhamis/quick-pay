import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { messageFor } from '../../core/api-error';
import { BulkUploadResult } from './models';
import { PaymentApi } from './payment-api';

@Component({
  imports: [RouterLink],
  selector: 'app-bulk-upload',
  styleUrl: './bulk-upload.css',
  templateUrl: './bulk-upload.html',
})
export class BulkUpload {
  private readonly paymentApi = inject(PaymentApi);

  protected readonly file = signal<File | null>(null);
  protected readonly result = signal<BulkUploadResult | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly isUploading = signal(false);

  protected chooseFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
  }

  protected upload(): void {
    const file = this.file();
    if (!file) {
      return;
    }
    this.result.set(null);
    this.errorMessage.set('');
    this.isUploading.set(true);

    this.paymentApi.uploadBulk(file).subscribe({
      next: (result) => {
        this.result.set(result);
        this.isUploading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(messageFor(error));
        this.isUploading.set(false);
      },
    });
  }
}
