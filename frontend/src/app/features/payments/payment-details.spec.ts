import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { PaymentResponse } from './models';
import { PaymentApi } from './payment-api';
import { PaymentDetails } from './payment-details';

const payment: PaymentResponse = {
  id: 7,
  senderAccount: 'JO111',
  receiverAccount: 'JO222',
  amount: 12.5,
  currency: 'USD',
  status: 'PENDING',
  createdAt: '2026-10-05T10:00:00Z',
  notes: 'Rent',
  creditorName: 'Ali Hassan',
};

describe('PaymentDetails', () => {
  const getOne = vi.fn();

  async function render() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PaymentApi, useValue: { getOne } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', '7']]) } } },
      ],
    });
    const fixture = TestBed.createComponent(PaymentDetails);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => getOne.mockReset());

  it('shows a loading text while the payment is loading', async () => {
    getOne.mockReturnValue(NEVER);

    const root = await render();

    expect(root.textContent).toContain('Loading payment...');
  });

  it('shows every field of the payment', async () => {
    getOne.mockReturnValue(of(payment));

    const root = await render();

    expect(getOne).toHaveBeenCalledWith('7');
    const text = root.textContent!;
    ['7', 'PENDING', 'JO111', 'JO222', 'Ali Hassan', '12.5 USD', 'Rent'].forEach((value) =>
      expect(text).toContain(value),
    );
  });

  it('shows None when the payment has no notes', async () => {
    getOne.mockReturnValue(of({ ...payment, notes: null }));

    const root = await render();

    expect(root.textContent).toContain('None');
  });

  it('links back to the list', async () => {
    getOne.mockReturnValue(of(payment));

    const root = await render();

    const link = root.querySelector('a')!;
    expect(link.textContent).toBe('Back to list');
    expect(link.getAttribute('href')).toBe('/payments');
  });

  it('shows "Payment not found" on a 404 and keeps the back link', async () => {
    getOne.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 404, error: 'Payment not found with id 7' }),
      ),
    );

    const root = await render();

    expect(root.querySelector('[role="alert"]')!.textContent).toBe('Payment not found');
    expect(root.querySelector('a')!.textContent).toBe('Back to list');
  });

  it('shows a message when the server cannot be reached', async () => {
    getOne.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    const root = await render();

    expect(root.querySelector('[role="alert"]')!.textContent).toBe('Could not reach the server.');
  });

  it('shows a permission message on a 403', async () => {
    getOne.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));

    const root = await render();

    expect(root.querySelector('[role="alert"]')!.textContent).toBe(
      'You do not have permission to do this.',
    );
  });

  it('shows a status message when the id is not a number (default Spring 400)', async () => {
    getOne.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { status: 400 } })),
    );

    const root = await render();

    expect(root.querySelector('[role="alert"]')!.textContent).toBe(
      'The request failed (status 400). Please try again.',
    );
  });
});
