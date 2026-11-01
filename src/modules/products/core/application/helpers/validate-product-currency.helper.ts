import { ErrorKind } from '../../../../../shared-kernel/domain/exceptions/error-kind';

import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { Currency } from '../../../../../shared-kernel/domain/value-objects/currency';
import { SupportedCurrenciesPort } from '../ports/supported-currencies.port';

export function validateProductCurrency(
  currency: string,
  supportedCurrenciesPort: SupportedCurrenciesPort,
): Result<Currency, UseCaseError> {
  const currencyResult = Currency.create(currency);
  if (currencyResult.isFailure) {
    return ErrorFactory.UseCaseError(currencyResult.error.message, {
      kind: ErrorKind.INVALID,
    });
  }

  const supportedCurrencies = supportedCurrenciesPort.getSupportedCurrencies();
  if (!supportedCurrencies.includes(currencyResult.value.code)) {
    return ErrorFactory.UseCaseError(
      `Currency "${currency}" is not supported by this store`,
      { kind: ErrorKind.INVALID },
    );
  }

  return Result.success(currencyResult.value);
}
