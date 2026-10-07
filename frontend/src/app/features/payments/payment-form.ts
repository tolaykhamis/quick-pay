import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { messageFor, violationsOf } from '../../core/api-error';
import { PaymentRequest } from './models';
import { PaymentApi } from './payment-api';

type FieldName = keyof PaymentRequest;

const messages: Record<FieldName, Record<string, string>> = {
  senderAccount: {
    required: 'Sender account is required',
    maxlength: 'Sender account must be at most 34 characters',
  },
  receiverAccount: {
    required: 'Receiver account is required',
    maxlength: 'Receiver account must be at most 34 characters',
    sameAccounts: 'Receiver account must differ from the sender account',
  },
  amount: {
    required: 'Amount is required',
    amountPositive: 'Amount must be a positive number',
    amountDecimals: 'Amount can have at most 2 decimal places',
    amountDigits: 'Amount can have at most 36 digits before the decimal point',
  },
  currency: { required: 'Currency is required' },
  notes: {},
  creditorName: {
    required: 'Creditor name is required',
    maxlength: 'Creditor name must be at most 100 characters',
    creditorFormat: 'Creditor name must be two words of letters or digits, separated by one space',
  },
};

function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() === '' ? { required: true } : null;
}

function maxTrimmed(max: number): ValidatorFn {
  return (control) => (control.value.trim().length > max ? { maxlength: true } : null);
}

function amountRule(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value.trim();
  if (value === '') {
    return null;
  }
  if (!/^\d*\.?\d+$/.test(value) || Number(value) <= 0) {
    return { amountPositive: true };
  }
  const [whole, decimals = ''] = value.split('.');
  if (decimals.replace(/0+$/, '').length > 2) {
    return { amountDecimals: true };
  }
  if (whole.replace(/^0+/, '').length > 36) {
    return { amountDigits: true };
  }
  return null;
}

function creditorRule(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value;
  return value.trim() === '' || /^[A-Za-z0-9]+ [A-Za-z0-9]+$/.test(value)
    ? null
    : { creditorFormat: true };
}

function differentAccounts(group: AbstractControl): ValidationErrors | null {
  const { senderAccount, receiverAccount } = group.value as Record<string, string>;
  const sender = senderAccount.trim().toLowerCase();
  return sender !== '' && sender === receiverAccount.trim().toLowerCase()
    ? { sameAccounts: true }
    : null;
}

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-payment-form',
  styleUrl: './payment-form.css',
  templateUrl: './payment-form.html',
})
export class PaymentForm {
  private readonly paymentApi = inject(PaymentApi);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      senderAccount: ['', [notBlank, maxTrimmed(34)]],
      receiverAccount: ['', [notBlank, maxTrimmed(34)]],
      amount: ['', [notBlank, amountRule]],
      currency: ['', notBlank],
      notes: [''],
      creditorName: ['', [notBlank, Validators.maxLength(100), creditorRule]],
    },
    { validators: differentAccounts },
  );
  protected readonly serverErrors = signal<Record<string, string>>({});
  protected readonly formError = signal('');
  protected readonly isSubmitting = signal(false);

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.serverErrors.set({});
      this.formError.set('');
    });
  }

  protected errorOf(name: FieldName): string {
    const serverMessage = this.serverErrors()[name];
    if (serverMessage) {
      return serverMessage;
    }
    const control = this.form.controls[name];
    if (!control.touched && !control.dirty) {
      return '';
    }
    const errors = { ...control.errors, ...this.form.errors };
    const key = Object.keys(errors).find((item) => item in messages[name]);
    return key ? messages[name][key] : '';
  }

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    const { amount, ...rest } = this.form.getRawValue();
    this.serverErrors.set({});
    this.formError.set('');
    this.isSubmitting.set(true);

    this.paymentApi.create({ ...rest, amount: Number(amount) }).subscribe({
      next: (created) => this.router.navigate(['/payments', created.id]),
      error: (error: HttpErrorResponse) => {
        this.showBackendError(error);
        this.isSubmitting.set(false);
      },
    });
  }

  private showBackendError(error: HttpErrorResponse): void {
    const violations = violationsOf(error);
    if (violations.length === 0) {
      this.formError.set(messageFor(error));
      return;
    }
    const fieldErrors: Record<string, string> = {};
    const otherMessages: string[] = [];
    for (const violation of violations) {
      if (violation.violator in this.form.controls) {
        fieldErrors[violation.violator] = [fieldErrors[violation.violator], violation.message]
          .filter(Boolean)
          .join('; ');
      } else {
        otherMessages.push(violation.message);
      }
    }
    this.serverErrors.set(fieldErrors);
    this.formError.set(
      otherMessages.length > 0
        ? otherMessages.join('; ')
        : 'The server rejected the payment. Fix the fields with errors and submit again.',
    );
  }
}
