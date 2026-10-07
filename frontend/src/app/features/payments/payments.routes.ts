import { Routes } from '@angular/router';

export const paymentsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./payment-list').then((m) => m.PaymentList),
  },
  {
    path: 'new',
    loadComponent: () => import('./payment-form').then((m) => m.PaymentForm),
  },
  {
    path: 'bulk',
    loadComponent: () => import('./bulk-upload').then((m) => m.BulkUpload),
  },
  {
    path: ':id',
    loadComponent: () => import('./payment-details').then((m) => m.PaymentDetails),
  },
];
