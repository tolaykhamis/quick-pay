import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Auth } from './auth';
import { Shell } from './shell';

describe('Shell', () => {
  const isLoggedIn = signal(false);
  const logout = vi.fn();

  beforeEach(() => {
    isLoggedIn.set(false);
    logout.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Auth, useValue: { isLoggedIn, logout } }],
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the QuickPay brand in the header', async () => {
    const root = await render();

    expect(root.querySelector('header .brand')!.textContent).toBe('QuickPay');
  });

  it('hides the Log out button while logged out', async () => {
    const root = await render();

    expect(root.querySelector('button')).toBeNull();
  });

  it('logs out when "Log out" is clicked', async () => {
    isLoggedIn.set(true);
    const root = await render();

    root.querySelector('button')!.click();

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('has a main area for the page', async () => {
    const root = await render();

    expect(root.querySelector('main router-outlet')).not.toBeNull();
  });
});
