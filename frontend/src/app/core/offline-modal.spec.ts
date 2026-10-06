import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Connectivity } from './connectivity';
import { OfflineModal } from './offline-modal';

describe('OfflineModal', () => {
  const isOffline = signal(false);
  const isRetrying = signal(false);
  const retry = vi.fn();

  beforeEach(() => {
    isOffline.set(false);
    isRetrying.set(false);
    retry.mockClear();
    TestBed.configureTestingModule({
      providers: [{ provide: Connectivity, useValue: { isOffline, isRetrying, retry } }],
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(OfflineModal);
    await fixture.whenStable();
    return fixture;
  }

  it('shows nothing while online', async () => {
    const fixture = await render();

    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('shows the modal when offline', async () => {
    isOffline.set(true);
    const fixture = await render();

    const modal = fixture.nativeElement.querySelector('[role="alertdialog"]');
    expect(modal.textContent).toContain('No internet connection');
  });

  it('calls retry() when "Try again" is clicked', async () => {
    isOffline.set(true);
    const fixture = await render();

    fixture.nativeElement.querySelector('button').click();

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('disables the button while a retry is running', async () => {
    isOffline.set(true);
    isRetrying.set(true);
    const fixture = await render();

    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
  });
});
