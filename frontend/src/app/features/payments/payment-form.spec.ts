import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { PaymentResponse } from './models';
import { PaymentApi } from './payment-api';
import { PaymentForm } from './payment-form';

const validValues = {
  senderAccount: 'JO111',
  receiverAccount: 'JO222',
  amount: '12.50',
  currency: 'JOD',
  creditorName: 'Ali Hassan',
};

describe('PaymentForm', () => {
  const create = vi.fn();
  let fixture: ComponentFixture<PaymentForm>;
  let root: HTMLElement;
  let navigate: ReturnType<typeof vi.spyOn>;

  async function type(id: string, value: string) {
    const input = root.querySelector<HTMLInputElement>('#' + id)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function fillValid(overrides: Record<string, string> = {}) {
    for (const [id, value] of Object.entries({ ...validValues, ...overrides })) {
      await type(id, value);
    }
  }

  async function submit() {
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  function errorOf(id: string) {
    return root.querySelector('#' + id + '-error')?.textContent?.trim() ?? '';
  }

  function submitButton() {
    return root.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  }

  function formAlert() {
    return root.querySelector('.form-error')?.textContent?.trim() ?? '';
  }

  beforeEach(async () => {
    create.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PaymentApi, useValue: { create } }],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(PaymentForm);
    await fixture.whenStable();
    root = fixture.nativeElement as HTMLElement;
  });

  describe('frontend validation', () => {
    it('starts with submit disabled and no errors shown', () => {
      expect(submitButton().disabled).toBe(true);
      expect(root.querySelectorAll('[role="alert"]').length).toBe(0);
    });

    it('enables submit when every rule passes', async () => {
      await fillValid();

      expect(submitButton().disabled).toBe(false);
      expect(root.querySelectorAll('[role="alert"]').length).toBe(0);
    });

    it.each(['senderAccount', 'receiverAccount', 'amount', 'currency', 'creditorName'])(
      'rejects a whitespace-only %s as required',
      async (id) => {
        await fillValid({ [id]: '   ' });

        expect(errorOf(id)).toMatch(/is required$/);
        expect(submitButton().disabled).toBe(true);
      },
    );

    it('rejects an empty required field after it is touched', async () => {
      await type('amount', '');

      expect(errorOf('amount')).toBe('Amount is required');
    });

    it('allows empty notes and long notes', async () => {
      await fillValid({ notes: 'x'.repeat(2000) });

      expect(submitButton().disabled).toBe(false);
    });

    it.each(['senderAccount', 'receiverAccount'])(
      'rejects a %s longer than 34 characters but allows 34',
      async (id) => {
        await fillValid({ [id]: 'A'.repeat(35) });
        expect(errorOf(id)).toMatch(/at most 34 characters$/);
        expect(submitButton().disabled).toBe(true);

        await fillValid({ [id]: 'A'.repeat(34) });
        expect(errorOf(id)).toBe('');
        expect(submitButton().disabled).toBe(false);
      },
    );

    it('counts account length after trimming', async () => {
      await fillValid({ senderAccount: '  ' + 'A'.repeat(34) + '  ' });

      expect(errorOf('senderAccount')).toBe('');
    });

    it('rejects a receiver equal to the sender, ignoring case and spaces', async () => {
      await fillValid({ senderAccount: 'ACC-100', receiverAccount: ' acc-100 ' });

      expect(errorOf('receiverAccount')).toBe(
        'Receiver account must differ from the sender account',
      );
      expect(submitButton().disabled).toBe(true);
    });

    it.each([
      ['abc', 'Amount must be a positive number'],
      ['-5', 'Amount must be a positive number'],
      ['0', 'Amount must be a positive number'],
      ['0.00', 'Amount must be a positive number'],
      ['1e5', 'Amount must be a positive number'],
      ['10.555', 'Amount can have at most 2 decimal places'],
      ['1'.repeat(37), 'Amount can have at most 36 digits before the decimal point'],
    ])('rejects the amount "%s"', async (value, message) => {
      await fillValid({ amount: value });

      expect(errorOf('amount')).toBe(message);
      expect(submitButton().disabled).toBe(true);
    });

    it.each(['10', '0.5', '.5', '10.5', '10.50', '10.500', '1'.repeat(36)])(
      'accepts the amount "%s"',
      async (value) => {
        await fillValid({ amount: value });

        expect(errorOf('amount')).toBe('');
        expect(submitButton().disabled).toBe(false);
      },
    );

    it.each(['Ahmad', 'Ali Hassan Omar', 'Ali  Hassan', ' Ali Hassan', 'Ali Hassan ', 'Ali H-san'])(
      'rejects the creditor name "%s" as not two words',
      async (value) => {
        await fillValid({ creditorName: value });

        expect(errorOf('creditorName')).toBe(
          'Creditor name must be two words of letters or digits, separated by one space',
        );
        expect(submitButton().disabled).toBe(true);
      },
    );

    it('rejects a creditor name longer than 100 characters', async () => {
      await fillValid({ creditorName: 'A'.repeat(60) + ' ' + 'B'.repeat(60) });

      expect(errorOf('creditorName')).toBe('Creditor name must be at most 100 characters');
    });

    it('accepts a creditor name with digits', async () => {
      await fillValid({ creditorName: 'Ali2 Hassan3' });

      expect(errorOf('creditorName')).toBe('');
    });

    it('does not call the API when the form is invalid', async () => {
      await fillValid({ amount: 'abc' });

      await submit();

      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('submitting', () => {
    const created = { id: 42 } as PaymentResponse;

    it('sends the values with the amount as a number and opens the new payment', async () => {
      create.mockReturnValue(of(created));
      await fillValid({ notes: 'Rent' });

      await submit();

      expect(create).toHaveBeenCalledWith({
        senderAccount: 'JO111',
        receiverAccount: 'JO222',
        amount: 12.5,
        currency: 'JOD',
        notes: 'Rent',
        creditorName: 'Ali Hassan',
      });
      expect(navigate).toHaveBeenCalledWith(['/payments', 42]);
    });

    it('disables submit and shows progress while the request is running', async () => {
      create.mockReturnValue(NEVER);
      await fillValid();

      await submit();

      expect(submitButton().disabled).toBe(true);
      expect(submitButton().textContent).toContain('Creating...');
    });
  });

  describe('backend errors after a valid-looking form', () => {
    async function submitRejectedWith(error: HttpErrorResponse) {
      create.mockReturnValue(throwError(() => error));
      await fillValid();
      await submit();
    }

    it('shows each violation next to its field and a summary', async () => {
      await submitRejectedWith(
        new HttpErrorResponse({
          status: 400,
          error: [
            { message: 'currency is not supported', violator: 'currency' },
            { message: 'amount must have maximum 2 decimal places', violator: 'amount' },
          ],
        }),
      );

      expect(errorOf('currency')).toBe('currency is not supported');
      expect(errorOf('amount')).toBe('amount must have maximum 2 decimal places');
      expect(formAlert()).toBe(
        'The server rejected the payment. Fix the fields with errors and submit again.',
      );
      expect(navigate).not.toHaveBeenCalled();
    });

    it('joins several violations of the same field', async () => {
      await submitRejectedWith(
        new HttpErrorResponse({
          status: 400,
          error: [
            { message: 'first problem', violator: 'amount' },
            { message: 'second problem', violator: 'amount' },
          ],
        }),
      );

      expect(errorOf('amount')).toBe('first problem; second problem');
    });

    it('shows a violation with an unknown violator in the form alert', async () => {
      await submitRejectedWith(
        new HttpErrorResponse({
          status: 400,
          error: [{ message: 'payment is a duplicate', violator: 'payment' }],
        }),
      );

      expect(formAlert()).toBe('payment is a duplicate');
    });

    it('shows a plain text error', async () => {
      await submitRejectedWith(new HttpErrorResponse({ status: 400, error: 'Something specific' }));

      expect(formAlert()).toBe('Something specific');
    });

    it('shows the status for the Spring default error object', async () => {
      await submitRejectedWith(
        new HttpErrorResponse({ status: 400, error: { status: 400, error: 'Bad Request' } }),
      );

      expect(formAlert()).toBe('The request failed (status 400). Please try again.');
    });

    it('shows a message when the server cannot be reached', async () => {
      await submitRejectedWith(new HttpErrorResponse({ status: 0 }));

      expect(formAlert()).toBe('Could not reach the server.');
    });

    it('shows a permission message on a 403', async () => {
      await submitRejectedWith(new HttpErrorResponse({ status: 403 }));

      expect(formAlert()).toBe('You do not have permission to do this.');
    });

    it('enables submit again after a failure', async () => {
      await submitRejectedWith(new HttpErrorResponse({ status: 500 }));

      expect(submitButton().disabled).toBe(false);
    });

    it('clears the backend errors when the user edits a field', async () => {
      await submitRejectedWith(
        new HttpErrorResponse({
          status: 400,
          error: [{ message: 'currency is not supported', violator: 'currency' }],
        }),
      );

      await type('currency', 'USD');

      expect(errorOf('currency')).toBe('');
      expect(formAlert()).toBe('');
    });
  });
});
