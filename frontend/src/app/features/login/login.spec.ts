import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Auth } from '../../core/auth';
import { Login } from './login';

describe('Login', () => {
  const login = vi.fn();
  const navigate = vi.fn();
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    login.mockReset();
    navigate.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: { login } },
        { provide: Router, useValue: { navigate } },
      ],
    });
    fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
  });

  const root = () => fixture.nativeElement as HTMLElement;

  async function fill(username: string, password: string) {
    const usernameInput = root().querySelector<HTMLInputElement>('#username')!;
    const passwordInput = root().querySelector<HTMLInputElement>('#password')!;
    usernameInput.value = username;
    usernameInput.dispatchEvent(new Event('input'));
    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function fillAndSubmit(username: string, password: string) {
    await fill(username, password);
    root().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('disables the button until both fields are filled', async () => {
    const button = root().querySelector('button')!;
    expect(button.disabled).toBe(true);

    await fill('tolay', '12345');

    expect(button.disabled).toBe(false);
  });

  it('logs in with the typed values and goes to the home page', async () => {
    login.mockReturnValue(of({ accessToken: 'a', refreshToken: 'r' }));

    await fillAndSubmit('tolay', '12345');

    expect(login).toHaveBeenCalledWith('tolay', '12345');
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('shows "Wrong username or password." on a 401', async () => {
    login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

    await fillAndSubmit('tolay', 'bad');

    expect(root().querySelector('[role="alert"]')!.textContent).toBe('Wrong username or password.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows "Could not reach the server." when there is no response (status 0)', async () => {
    login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    await fillAndSubmit('tolay', '12345');

    expect(root().querySelector('[role="alert"]')!.textContent).toBe('Could not reach the server.');
  });

  it('shows a "server had a problem" message on any other failure', async () => {
    login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    await fillAndSubmit('tolay', '12345');

    expect(root().querySelector('[role="alert"]')!.textContent).toBe(
      'The server had a problem. Please try again.',
    );
  });
});
