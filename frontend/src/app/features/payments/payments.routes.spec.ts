import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NEVER, of } from 'rxjs';
import { BulkUpload } from './bulk-upload';
import { PaymentApi } from './payment-api';
import { PaymentDetails } from './payment-details';
import { PaymentForm } from './payment-form';
import { PaymentList } from './payment-list';
import { paymentsRoutes } from './payments.routes';

describe('paymentsRoutes', () => {
  async function open(url: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(paymentsRoutes),
        {
          provide: PaymentApi,
          useValue: { list: () => of({ content: [] }), getOne: () => NEVER },
        },
      ],
    });
    const harness = await RouterTestingHarness.create();
    return harness.navigateByUrl(url);
  }

  it('shows the list on the empty path', async () => {
    expect(await open('/')).toBeInstanceOf(PaymentList);
  });

  it('shows the create form for "new", not the details page', async () => {
    expect(await open('/new')).toBeInstanceOf(PaymentForm);
  });

  it('shows the bulk upload for "bulk", not the details page', async () => {
    expect(await open('/bulk')).toBeInstanceOf(BulkUpload);
  });

  it('shows the details page for a payment id', async () => {
    expect(await open('/7')).toBeInstanceOf(PaymentDetails);
  });
});
