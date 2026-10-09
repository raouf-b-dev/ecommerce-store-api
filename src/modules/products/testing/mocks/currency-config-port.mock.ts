import { CurrencyConfigPort } from '../../core/application/ports/currency-config.port';

export class MockCurrencyConfigAdapter implements CurrencyConfigPort {
  constructor(
    private readonly defaultCurrency = 'USD',
    private readonly supportedCurrencies = ['USD'],
  ) {}

  getDefaultCurrency(): string {
    return this.defaultCurrency;
  }

  getSupportedCurrencies(): string[] {
    return this.supportedCurrencies;
  }
}
