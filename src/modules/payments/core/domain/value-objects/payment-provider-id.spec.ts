import { PaymentProviderId } from './payment-provider-id';
import { ResultAssertionHelper } from '../../../../../testing';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';

describe('PaymentProviderId', () => {
  it('creates valid PaymentProviderId from slug', () => {
    const result = PaymentProviderId.create('stripe');

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.value).toBe('stripe');
    expect(result.value.toString()).toBe('stripe');
  });

  it('accepts alphanumeric characters and hyphens', () => {
    const result = PaymentProviderId.create('provider-123-abc');

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.value).toBe('provider-123-abc');
  });

  it('compares equality based on value', () => {
    const p1 = PaymentProviderId.create('custom-provider');
    const p2 = PaymentProviderId.create('custom-provider');
    const p3 = PaymentProviderId.create('other');

    ResultAssertionHelper.assertResultSuccess(p1);
    ResultAssertionHelper.assertResultSuccess(p2);
    ResultAssertionHelper.assertResultSuccess(p3);

    expect(p1.value.equals(p2.value)).toBe(true);
    expect(p1.value.equals(p3.value)).toBe(false);
  });

  it('fails when value is not a string', () => {
    const result = PaymentProviderId.create(123);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment provider ID must be a string',
      DomainError,
    );
  });

  it('fails when value is empty', () => {
    const result = PaymentProviderId.create('');

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment provider ID cannot be empty',
      DomainError,
    );
  });

  it('fails without trimming when value contains whitespace', () => {
    const result = PaymentProviderId.create(' stripe ');

    ResultAssertionHelper.assertResultFailure(
      result,
      "Invalid payment provider ID format: ' stripe '",
      DomainError,
    );
  });

  it('fails when value has underscores or uppercase characters', () => {
    const withUnderscore = PaymentProviderId.create('stripe_eu');
    ResultAssertionHelper.assertResultFailure(
      withUnderscore,
      "Invalid payment provider ID format: 'stripe_eu'",
      DomainError,
    );

    const withUppercase = PaymentProviderId.create('STRIPE');
    ResultAssertionHelper.assertResultFailure(
      withUppercase,
      "Invalid payment provider ID format: 'STRIPE'",
      DomainError,
    );
  });
});
