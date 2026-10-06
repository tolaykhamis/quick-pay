import { Component, inject } from '@angular/core';
import { Connectivity } from './connectivity';

@Component({
  selector: 'app-offline-modal',
  styleUrl: './offline-modal.css',
  templateUrl: './offline-modal.html',
})
export class OfflineModal {
  private readonly connectivity = inject(Connectivity);

  protected readonly isOffline = this.connectivity.isOffline;
  protected readonly isRetrying = this.connectivity.isRetrying;

  protected tryAgain(): void {
    this.connectivity.retry();
  }
}
