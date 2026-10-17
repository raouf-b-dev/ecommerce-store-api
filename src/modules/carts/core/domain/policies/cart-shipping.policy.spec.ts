import { Money } from '../../../../../shared-kernel/domain/value-objects/money';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { applyCartShipping } from './cart-shipping.policy';

describe('applyCartShipping', () => {
  it('adds zero shipping and returns the same total', () => {
    const subtotalResult = Money.create(1999, 'USD');
    ResultAssertionHelper.assertResultSuccess(subtotalResult);

    const result = applyCartShipping(subtotalResult.value);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.shippingCost.amount).toBe(0);
    expect(result.value.shippingCost.currency).toBe('USD');
    expect(result.value.totalAmount.amount).toBe(1999);
    expect(result.value.totalAmount.toMajorUnits()).toBe(19.99);
  });

  it('works for a zero subtotal in the cart currency', () => {
    const subtotalResult = Money.zero('EUR');
    ResultAssertionHelper.assertResultSuccess(subtotalResult);

    const result = applyCartShipping(subtotalResult.value);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.shippingCost.amount).toBe(0);
    expect(result.value.shippingCost.currency).toBe('EUR');
    expect(result.value.totalAmount.amount).toBe(0);
  });
});
