import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';

/**
 * MVP shipping policy: free shipping until a shipping engine ships.
 * Keeps totals in Money (minor units) so presentation and query mappers share one rule.
 */
export function applyCartShipping(subtotal: Money): Result<
  {
    shippingCost: Money;
    totalAmount: Money;
  },
  DomainError
> {
  const shippingResult = Money.zero(subtotal.currency);
  if (shippingResult.isFailure) {
    return shippingResult;
  }
  const totalResult = subtotal.add(shippingResult.value);
  if (totalResult.isFailure) {
    return totalResult;
  }
  return Result.success({
    shippingCost: shippingResult.value,
    totalAmount: totalResult.value,
  });
}
