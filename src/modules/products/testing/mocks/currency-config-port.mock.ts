import { CurrencyConfigPort } from '../../core/application/ports/currency-config.port';

export class MockCurrencyConfigAdapter implements CurrencyConfigPort {
  constructor(private readonly supportedCurrencies: string[]) {}

  getSupportedCurrencies(): string[] {
    return this.supportedCurrencies;
  }
}
