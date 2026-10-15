import { Injectable } from '@nestjs/common';
import { EnvConfigService } from '../../config/env-config.service';
import { Currency } from '../../shared-kernel/domain/value-objects/currency';
import { Result } from '../../shared-kernel/domain/result';
import { DomainError } from '../../shared-kernel/domain/exceptions/domain.error';
import { PlatformConfigResponseDto } from './dto/platform-config-response.dto';

@Injectable()
export class GetPlatformConfigQuery {
  constructor(private readonly envConfig: EnvConfigService) {}

  execute(): Result<PlatformConfigResponseDto, DomainError> {
    const currencyResult = Currency.create(
      this.envConfig.store.defaultCurrency,
    );
    if (currencyResult.isFailure) {
      return currencyResult;
    }
    const currency = currencyResult.value;
    return Result.success({
      defaultCurrency: currency.code,
      defaultCurrencyExponent: currency.exponent,
      supportedCurrencies: this.envConfig.store.supportedCurrencies,
    });
  }
}
