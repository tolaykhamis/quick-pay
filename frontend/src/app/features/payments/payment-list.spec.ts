import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PagedResult, PaymentResponse } from './models';
import { PaymentApi } from './payment-api';
import { PaymentList } from './payment-list';

const payment: PaymentResponse = {
  id: 7,
  senderAccount: 'JO111',
  receiverAccount: 'JO222',
  amount: 12.5,
  currency: 'USD',
  status: 'PENDING',
  createdAt: '2026-10-05T10:00:00Z',
  notes: null,
  creditorName: 'Ali Hassan',
};

function pageOf(content: PaymentResponse[], totalElements = content.length) {
  const result: PagedResult<PaymentResponse> = {
    content,
    pageNumber: 0,
    pageSize: 20,
    totalElements,
    totalPages: 1,
  };
  return result;
}

describe('PaymentList', () => {
  const list = vi.fn();
  let fixture: ComponentFixture<PaymentList>;

  async function render() {
    TestBed.configureTestingModule({ providers: [{ provide: PaymentApi, useValue: { list } }] });
    fixture = TestBed.createComponent(PaymentList);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => list.mockReset());

  it('shows one table row per payment', async () => {
    list.mockReturnValue(of(pageOf([payment, { ...payment, id: 8 }], 30)));

    const root = await render();

    expect(root.querySelectorAll('tbody tr').length).toBe(2);
    expect(root.textContent).toContain('JO111');
    expect(root.textContent).toContain('12.5 USD');
    expect(root.textContent).toContain('Showing 2 of 30 payments');
  });

  it('shows a message when there are no payments', async () => {
    list.mockReturnValue(of(pageOf([])));

    const root = await render();

    expect(root.querySelector('table')).toBeNull();
    expect(root.textContent).toContain('No payments yet.');
  });

  it('shows a permission message on a 403', async () => {
    list.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));

    const root = await render();

    expect(root.querySelector('[role="alert"]')!.textContent).toBe(
      'You do not have permission to view payments.',
    );
  });

  it('shows a generic message on any other failure', async () => {
    list.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    const root = await render();

    expect(root.querySelector('[role="alert"]')!.textContent).toBe(
      'Could not load payments. Please try again.',
    );
  });
});
