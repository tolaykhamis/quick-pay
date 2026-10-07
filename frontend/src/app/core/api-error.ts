import { HttpErrorResponse } from '@angular/common/http';

export interface Violation {
  message: string;
  violator: string;
}

export function violationsOf(error: HttpErrorResponse): Violation[] {
  const body: unknown = error.error;
  return Array.isArray(body) ? body.filter(isViolation) : [];
}

export function messageFor(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Could not reach the server.';
  }
  if (error.status === 401) {
    return 'Your session has expired. Please log in again.';
  }
  if (error.status === 403) {
    return 'You do not have permission to do this.';
  }
  const violations = violationsOf(error);
  if (violations.length > 0) {
    return violations.map((violation) => violation.message).join('; ');
  }
  if (typeof error.error === 'string' && error.error.trim() !== '') {
    return error.error;
  }
  return `The request failed (status ${error.status}). Please try again.`;
}

function isViolation(item: unknown): item is Violation {
  return (
    typeof item === 'object' &&
    item !== null &&
    'message' in item &&
    'violator' in item &&
    typeof item.message === 'string' &&
    typeof item.violator === 'string'
  );
}
