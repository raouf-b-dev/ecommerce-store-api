import { Injectable } from '@nestjs/common';
import { EnvConfigService } from '../../../../config/env-config.service';
import { CurrencyConfigPort } from '../../core/application/ports/currency-config.port';

@Injectable()
export class EnvCurrencyConfigAdapter implements CurrencyConfigPort {
  constructor(private readonly envConfig: EnvConfigService) {}

  getSupportedCurrencies(): string[] {
    return this.envConfig.store.supportedCurrencies;
  }
}
