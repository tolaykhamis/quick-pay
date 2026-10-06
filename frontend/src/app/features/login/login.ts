import {HttpErrorResponse} from '@angular/common/http';
import {Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {Auth} from '../../core/auth';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-login',
  styles: `
    form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 20rem;
    }
    .error {
      color: #b00020;
    }
  `,
  template: `
    <h2>Log in</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <label for="username">Username</label>
      <input id="username" formControlName="username" autocomplete="username" />

      <label for="password">Password</label>
      <input id="password" type="password" formControlName="password" autocomplete="current-password" />

      @if (errorMessage()) {
        <p class="error" role="alert">{{ errorMessage() }}</p>
      }

      <button type="submit" [disabled]="form.invalid || isSubmitting()">Log in</button>
    </form>
  `,
})
export class Login {
  protected readonly errorMessage = signal('');
  protected readonly isSubmitting = signal(false);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly form = this.formBuilder.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected submit(): void {
    const {username, password} = this.form.getRawValue();
    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.auth.login(username, password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.status === 401 ? 'Wrong username or password.' : error.status === 0 ? 'Could not reach the server.'
            : 'The server had a problem. Please try again.',
        );
        this.isSubmitting.set(false);
      },
    });
  }
}
