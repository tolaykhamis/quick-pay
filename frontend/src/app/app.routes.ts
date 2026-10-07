import { Routes } from '@angular/router';
import { authGuard } from './core/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    loadComponent: () => import('./core/shell').then((m) => m.Shell),
    children: [
      { path: '', redirectTo: 'payments', pathMatch: 'full' },
      {
        path: 'payments',
        canActivate: [authGuard],
        loadChildren: () =>
          import('./features/payments/payments.routes').then((m) => m.paymentsRoutes),
      },
      {
        path: '**',
        loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
