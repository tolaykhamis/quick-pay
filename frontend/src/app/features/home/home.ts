import { Component, inject } from '@angular/core';
import { Auth } from '../../core/auth';

@Component({
  selector: 'app-home',
  template: `
    <p>You are logged in.</p>
    <button type="button" (click)="logout()">Log out</button>
  `,
})
export class Home {
  private readonly auth = inject(Auth);

  protected logout(): void {
    this.auth.logout();
  }
}
