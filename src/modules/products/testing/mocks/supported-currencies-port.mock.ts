import { SupportedCurrenciesPort } from '../../core/application/ports/supported-currencies.port';

export class MockSupportedCurrenciesAdapter implements SupportedCurrenciesPort {
  constructor(private readonly supportedCurrencies: string[]) {}

  getSupportedCurrencies(): string[] {
    return this.supportedCurrencies;
  }
}
