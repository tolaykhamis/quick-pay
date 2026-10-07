import { HttpErrorResponse } from '@angular/common/http';
import { messageFor, violationsOf } from './api-error';

describe('api-error', () => {
  const violations = [
    { message: 'amount must be greater than zero', violator: 'amount' },
    { message: 'currency is not supported', violator: 'currency' },
  ];

  it('says the server is unreachable on status 0', () => {
    expect(messageFor(new HttpErrorResponse({ status: 0 }))).toBe('Could not reach the server.');
  });

  it('asks the user to log in again on a 401', () => {
    expect(messageFor(new HttpErrorResponse({ status: 401 }))).toBe(
      'Your session has expired. Please log in again.',
    );
  });

  it('reports a missing permission on a 403', () => {
    expect(messageFor(new HttpErrorResponse({ status: 403 }))).toBe(
      'You do not have permission to do this.',
    );
  });

  it('joins the messages of a violations array', () => {
    const error = new HttpErrorResponse({ status: 400, error: violations });

    expect(messageFor(error)).toBe('amount must be greater than zero; currency is not supported');
  });

  it('shows a plain text body as it is', () => {
    const error = new HttpErrorResponse({ status: 400, error: 'No template named nope' });

    expect(messageFor(error)).toBe('No template named nope');
  });

  it('falls back to the status for the Spring default error object', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { timestamp: '2026-10-07T11:04:07Z', status: 400, error: 'Bad Request', path: '/x' },
    });

    expect(messageFor(error)).toBe('The request failed (status 400). Please try again.');
  });

  it('falls back to the status for an empty body', () => {
    expect(messageFor(new HttpErrorResponse({ status: 500, error: '' }))).toBe(
      'The request failed (status 500). Please try again.',
    );
  });

  it('returns the violations of an array body', () => {
    expect(violationsOf(new HttpErrorResponse({ status: 400, error: violations }))).toEqual(
      violations,
    );
  });

  it('ignores array items that are not violations', () => {
    const error = new HttpErrorResponse({ status: 400, error: [{ message: 'x' }, 'text', null] });

    expect(violationsOf(error)).toEqual([]);
  });

  it('returns no violations for a text or object body', () => {
    expect(violationsOf(new HttpErrorResponse({ status: 400, error: 'text' }))).toEqual([]);
    expect(violationsOf(new HttpErrorResponse({ status: 400, error: { status: 400 } }))).toEqual(
      [],
    );
  });
});
