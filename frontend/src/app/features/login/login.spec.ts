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

  it('shows the brand and the "Sign in to QuickPay" title', () => {
    expect(root().querySelector('.brand')!.textContent).toBe('QuickPay');
    expect(root().querySelector('h2')!.textContent).toBe('Sign in to QuickPay');
  });

  it('logs in with the typed values and goes to the payments page', async () => {
    login.mockReturnValue(of({ accessToken: 'a', refreshToken: 'r' }));

    await fillAndSubmit('tolay', '12345');

    expect(login).toHaveBeenCalledWith('tolay', '12345');
    expect(navigate).toHaveBeenCalledWith(['/payments']);
  });

  it('shows the message the service fails with and stays on the page', async () => {
    login.mockReturnValue(throwError(() => new Error('Wrong username or password.')));

    await fillAndSubmit('tolay', 'bad');

    expect(root().querySelector('[role="alert"]')!.textContent).toBe('Wrong username or password.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('enables the button again after a failed login', async () => {
    login.mockReturnValue(throwError(() => new Error('Could not reach the server.')));

    await fillAndSubmit('tolay', '12345');

    expect(root().querySelector('button')!.disabled).toBe(false);
  });
});
