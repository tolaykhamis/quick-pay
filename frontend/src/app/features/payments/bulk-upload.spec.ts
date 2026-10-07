import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { BulkUploadResult } from './models';
import { BulkUpload } from './bulk-upload';
import { PaymentApi } from './payment-api';

const validResult: BulkUploadResult = {
  failures: [],
  validRows: [],
  successCount: 3,
  failureCount: 0,
};

const mixedResult: BulkUploadResult = {
  failures: [
    { rowNumber: 3, errors: ['amount must be greater than zero'] },
    { rowNumber: 4, errors: ['currency is not supported', 'receiverAccount must differ'] },
  ],
  validRows: [],
  successCount: 1,
  failureCount: 2,
};

describe('BulkUpload', () => {
  const uploadBulk = vi.fn();
  const file = new File(['a,b'], 'payments.csv', { type: 'text/csv' });
  let fixture: ComponentFixture<BulkUpload>;
  let root: HTMLElement;

  async function chooseFile(chosen: File | null = file) {
    const input = root.querySelector<HTMLInputElement>('#file')!;
    Object.defineProperty(input, 'files', { value: chosen ? [chosen] : [], configurable: true });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  async function upload() {
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  function uploadButton() {
    return root.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  }

  function alertText() {
    return root.querySelector('[role="alert"]')?.textContent?.trim();
  }

  beforeEach(async () => {
    uploadBulk.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PaymentApi, useValue: { uploadBulk } }],
    });
    fixture = TestBed.createComponent(BulkUpload);
    await fixture.whenStable();
    root = fixture.nativeElement as HTMLElement;
  });

  it('disables Upload until a file is chosen', async () => {
    expect(uploadButton().disabled).toBe(true);

    await chooseFile();

    expect(uploadButton().disabled).toBe(false);
  });

  it('disables Upload again when the file choice is cancelled', async () => {
    await chooseFile();

    await chooseFile(null);

    expect(uploadButton().disabled).toBe(true);
  });

  it('does not call the API without a file', async () => {
    await upload();

    expect(uploadBulk).not.toHaveBeenCalled();
  });

  it('shows progress and disables Upload while uploading', async () => {
    uploadBulk.mockReturnValue(NEVER);
    await chooseFile();

    await upload();

    expect(uploadBulk).toHaveBeenCalledWith(file);
    expect(uploadButton().disabled).toBe(true);
    expect(uploadButton().textContent).toContain('Uploading...');
  });

  it('shows the counts and a success message when every row is valid', async () => {
    uploadBulk.mockReturnValue(of(validResult));
    await chooseFile();

    await upload();

    const counts = root.querySelector('.counts')!.textContent!;
    expect(counts).toContain('3 successful rows');
    expect(counts).toContain('0 failed rows');
    expect(root.querySelector('table')).toBeNull();
    expect(root.querySelector('[role="status"]')!.textContent).toContain('valid');
  });

  it('shows a table row per failed row with all its errors', async () => {
    uploadBulk.mockReturnValue(of(mixedResult));
    await chooseFile();

    await upload();

    const counts = root.querySelector('.counts')!.textContent!;
    expect(counts).toContain('1 successful rows');
    expect(counts).toContain('2 failed rows');
    const rows = Array.from(root.querySelectorAll('tbody tr'));
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('td')!.textContent).toBe('3');
    expect(rows[0].textContent).toContain('amount must be greater than zero');
    expect(rows[1].querySelectorAll('li').length).toBe(2);
    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it('shows the plain text error for an unsupported file', async () => {
    uploadBulk.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: 'File type not supported' })),
    );
    await chooseFile();

    await upload();

    expect(alertText()).toBe('File type not supported');
    expect(root.querySelector('.counts')).toBeNull();
    expect(uploadButton().disabled).toBe(false);
  });

  it('shows the status for the Spring default error object', async () => {
    uploadBulk.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { status: 400 } })),
    );
    await chooseFile();

    await upload();

    expect(alertText()).toBe('The request failed (status 400). Please try again.');
  });

  it('shows a message when the server cannot be reached', async () => {
    uploadBulk.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await chooseFile();

    await upload();

    expect(alertText()).toBe('Could not reach the server.');
  });

  it('shows a permission message on a 403', async () => {
    uploadBulk.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    await chooseFile();

    await upload();

    expect(alertText()).toBe('You do not have permission to do this.');
  });

  it('shows the status for a file that is too large', async () => {
    uploadBulk.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 413 })));
    await chooseFile();

    await upload();

    expect(alertText()).toBe('The request failed (status 413). Please try again.');
  });

  it('clears the previous result when a new upload starts', async () => {
    uploadBulk.mockReturnValueOnce(of(mixedResult));
    await chooseFile();
    await upload();
    uploadBulk.mockReturnValueOnce(NEVER);

    await upload();

    expect(root.querySelector('.counts')).toBeNull();
  });
});
