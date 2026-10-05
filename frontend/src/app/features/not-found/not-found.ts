import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';

@Component({
  selector: 'app-not-found',
  styleUrl: './not-found.css',
  template: `
    <section>
      <h2>Page not found</h2>
      <p>The page you are looking for does not exist.</p>
      <button type="button" (click)="goBack()">Go back</button>
    </section>
  `,
})
export class NotFound {
  private readonly location = inject(Location);

  protected goBack(): void {
    this.location.back();
  }
}
