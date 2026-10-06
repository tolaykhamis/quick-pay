import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { Auth } from './core/auth';
import { authInterceptor } from './core/auth-interceptor';
import { networkErrorInterceptor } from './core/network-error-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withInterceptors([networkErrorInterceptor, authInterceptor])),
    provideAppInitializer(() => inject(Auth).restoreSession()),
  ],
};
