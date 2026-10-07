import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
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

function pageOf(content: PaymentResponse[], totalElements = content.length, pageNumber = 0) {
  const result: PagedResult<PaymentResponse> = {
    content,
    pageNumber,
    pageSize: 20,
    totalElements,
    totalPages: Math.max(1, Math.ceil(totalElements / 20)),
  };
  return result;
}

describe('PaymentList', () => {
  const list = vi.fn();
  let fixture: ComponentFixture<PaymentList>;
  let root: HTMLElement;

  async function render() {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PaymentApi, useValue: { list } }],
    });
    fixture = TestBed.createComponent(PaymentList);
    await fixture.whenStable();
    root = fixture.nativeElement as HTMLElement;
  }

  function button(label: string) {
    return Array.from(root.querySelectorAll('button')).find(
      (item) => item.textContent?.trim() === label,
    )!;
  }

  beforeEach(() => list.mockReset());

  it('shows a loading text while the payments are loading', async () => {
    list.mockReturnValue(NEVER);

    await render();

    expect(root.textContent).toContain('Loading payments...');
    expect(root.querySelector('table')).toBeNull();
  });

  it('shows one table row per payment', async () => {
    list.mockReturnValue(of(pageOf([payment, { ...payment, id: 8 }], 30)));

    await render();

    expect(list).toHaveBeenCalledWith(0);
    expect(root.querySelectorAll('tbody tr').length).toBe(2);
    expect(root.textContent).toContain('JO111');
    expect(root.textContent).toContain('12.5 USD');
    expect(root.textContent).toContain('Showing 2 of 30 payments');
  });

  it('shows "No payments" when the list is empty', async () => {
    list.mockReturnValue(of(pageOf([])));

    await render();

    expect(root.querySelector('table')).toBeNull();
    expect(root.textContent).toContain('No payments');
  });

  it('links to the create and bulk upload pages', async () => {
    list.mockReturnValue(of(pageOf([])));

    await render();

    const links = Array.from(root.querySelectorAll('.actions a'));
    expect(links.map((link) => link.textContent)).toEqual(['Create payment', 'Bulk upload']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/payments/new',
      '/payments/bulk',
    ]);
  });

  it('opens the details page when a row is clicked', async () => {
    list.mockReturnValue(of(pageOf([payment])));
    await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    root.querySelector<HTMLElement>('tbody tr')!.click();

    expect(navigate).toHaveBeenCalledWith(['/payments', 7]);
  });

  it('disables Previous on the first page and enables Next', async () => {
    list.mockReturnValue(of(pageOf([payment], 40)));

    await render();

    expect(root.textContent).toContain('Page 1 of 2');
    expect(button('Previous').disabled).toBe(true);
    expect(button('Next').disabled).toBe(false);
  });

  it('loads the next page when Next is clicked and disables Next on the last page', async () => {
    list.mockReturnValueOnce(of(pageOf([payment], 40)));
    await render();
    list.mockReturnValueOnce(of(pageOf([{ ...payment, id: 21 }], 40, 1)));

    button('Next').click();
    await fixture.whenStable();

    expect(list).toHaveBeenLastCalledWith(1);
    expect(root.textContent).toContain('Page 2 of 2');
    expect(button('Next').disabled).toBe(true);
    expect(button('Previous').disabled).toBe(false);
  });

  it('loads the previous page when Previous is clicked', async () => {
    list.mockReturnValueOnce(of(pageOf([payment], 40, 1)));
    await render();
    list.mockReturnValueOnce(of(pageOf([payment], 40, 0)));

    button('Previous').click();
    await fixture.whenStable();

    expect(list).toHaveBeenLastCalledWith(0);
    expect(root.textContent).toContain('Page 1 of 2');
  });

  it('shows a message when the server cannot be reached', async () => {
    list.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    await render();

    expect(root.querySelector('[role="alert"]')!.textContent).toBe('Could not reach the server.');
  });

  it('shows a permission message on a 403', async () => {
    list.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));

    await render();

    expect(root.querySelector('[role="alert"]')!.textContent).toBe(
      'You do not have permission to do this.',
    );
  });

  it('shows the plain text error the backend sent', async () => {
    list.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 400, error: 'Page size must be between 1 and 100' }),
      ),
    );

    await render();

    expect(root.querySelector('[role="alert"]')!.textContent).toBe(
      'Page size must be between 1 and 100',
    );
  });

  it('shows a status message on an unexpected failure', async () => {
    list.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    await render();

    expect(root.querySelector('[role="alert"]')!.textContent).toBe(
      'The request failed (status 500). Please try again.',
    );
  });

  it('replaces the table with the error when changing page fails', async () => {
    list.mockReturnValueOnce(of(pageOf([payment], 40)));
    await render();
    list.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));

    button('Next').click();
    await fixture.whenStable();

    expect(root.querySelector('table')).toBeNull();
    expect(root.querySelector('[role="alert"]')).not.toBeNull();
  });
});
