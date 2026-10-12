import { Result } from '../result';
import { DomainError } from '../exceptions/domain.error';
import { ErrorCode } from '../exceptions/error-code';
import { ErrorFactory } from '../exceptions/error.factory';

/**
 * Known zero-decimal currencies (ISO 4217 minor unit exponent = 0).
 * Matches Stripe zero-decimal currency list.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

/**
 * Known three-decimal currencies (ISO 4217 minor unit exponent = 3).
 * Matches Stripe three-decimal currency list.
 */
const THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);

function getRuntimeSupportedCurrencies(): Set<string> {
  if (
    typeof Intl !== 'undefined' &&
    typeof Intl.supportedValuesOf === 'function'
  ) {
    return new Set(Intl.supportedValuesOf('currency'));
  }
  return new Set();
}

let cachedSupportedCurrencies: Set<string> | undefined;

function getSupportedCurrencySet(): Set<string> {
  if (!cachedSupportedCurrencies) {
    cachedSupportedCurrencies = getRuntimeSupportedCurrencies();
  }
  return cachedSupportedCurrencies;
}

/**
 * Currency Value Object and ISO 4217 metadata repository.
 * Provides minor-unit exponent and precision conversions compatible with Stripe
 * and international payment gateways.
 */
export class Currency {
  private constructor(
    readonly code: string,
    readonly exponent: number,
  ) {}

  /**
   * Factory creating an immutable Currency Value Object.
   * Rejects currencies whose minor-unit exponent is not 2 because storage is scale 2.
   */
  static create(currency: string): Result<Currency, DomainError> {
    const normalized = Currency.normalize(currency);
    if (!normalized) {
      return ErrorFactory.DomainError(
        'Currency must be a 3-letter code (ISO 4217)',
        { code: ErrorCode.CURRENCY_INVALID },
      );
    }
    const exponent = Currency.getExponent(normalized);
    if (exponent !== 2) {
      return ErrorFactory.DomainError('Currency must have 2 decimal places', {
        code: ErrorCode.CURRENCY_INVALID,
      });
    }
    return Result.success(new Currency(normalized, exponent));
  }

  /**
   * Normalizes a currency code to uppercase, or returns undefined if invalid.
   */
  static normalize(currency: string): string | undefined {
    if (typeof currency !== 'string') {
      return undefined;
    }
    const normalized = currency.trim().toUpperCase();
    if (normalized.length !== 3) {
      return undefined;
    }
    const supported = getSupportedCurrencySet();
    if (supported.size === 0 || !supported.has(normalized)) {
      return undefined;
    }
    return normalized;
  }

  /**
   * Validates whether a given string is an authoritative ISO 4217 currency code.
   */
  static isValid(currency: string): boolean {
    return Currency.normalize(currency) !== undefined;
  }

  /** @internal For testing runtime fallback behavior. */
  static resetSupportedCurrenciesCache(override?: Set<string>): void {
    cachedSupportedCurrencies = override;
  }

  /**
   * Returns the minor-unit exponent for the given currency (e.g. 2 for USD, 0 for JPY, 3 for KWD).
   */
  static getExponent(currency: string): number {
    const normalized = currency.trim().toUpperCase();
    if (ZERO_DECIMAL_CURRENCIES.has(normalized)) {
      return 0;
    }
    if (THREE_DECIMAL_CURRENCIES.has(normalized)) {
      return 3;
    }
    return 2;
  }

  /**
   * Returns the multiplier factor for converting major units to minor units (e.g. 100 for USD, 1 for JPY).
   */
  static getFactor(currency: string): number {
    const exponent = Currency.getExponent(currency);
    return Math.pow(10, exponent);
  }
}
