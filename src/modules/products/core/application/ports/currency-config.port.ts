export abstract class CurrencyConfigPort {
  abstract getDefaultCurrency(): string;
  abstract getSupportedCurrencies(): string[];
}
