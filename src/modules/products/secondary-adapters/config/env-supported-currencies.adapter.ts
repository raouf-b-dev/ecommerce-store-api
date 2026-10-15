import { Injectable } from '@nestjs/common';
import { EnvConfigService } from '../../../../config/env-config.service';
import { SupportedCurrenciesPort } from '../../core/application/ports/supported-currencies.port';

@Injectable()
export class EnvSupportedCurrenciesAdapter implements SupportedCurrenciesPort {
  constructor(private readonly envConfig: EnvConfigService) {}

  getSupportedCurrencies(): string[] {
    return this.envConfig.store.supportedCurrencies;
  }
}
