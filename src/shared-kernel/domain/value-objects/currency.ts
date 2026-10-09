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
    return Result.success(new Currency(normalized, exponent));
  }

  /**
   * Unwraps Currency or throws DomainError if invalid.
   */
  static of(currency: string): Currency {
    const result = Currency.create(currency);
    if (result.isFailure) {
      throw result.error;
    }
    return result.value;
  }

  /**
   * Validates whether a given string is an authoritative ISO 4217 currency code.
   */
  static isValid(currency: string): boolean {
    const normalized = currency?.trim().toUpperCase();
    if (!normalized || normalized.length !== 3) {
      return false;
    }
    const supported = getSupportedCurrencySet();
    if (supported.size > 0) {
      return supported.has(normalized);
    }
    return /^[A-Z]{3}$/.test(normalized);
  }

  /**
   * Normalizes a currency code to uppercase, or returns undefined if invalid.
   */
  static normalize(currency: string): string | undefined {
    return Currency.isValid(currency)
      ? currency.trim().toUpperCase()
      : undefined;
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

  /**
   * Converts a major-unit amount to integer minor units (e.g. 19.99 USD -> 1999 cents, 1000 JPY -> 1000).
   */
  static toMinorUnits(
    amount: number | string,
    currency: string,
  ): number | undefined {
    const num = typeof amount === 'string' ? Number(amount.trim()) : amount;
    if (!Number.isFinite(num) || num < 0) {
      return undefined;
    }
    const factor = Currency.getFactor(currency);
    const minor = Math.round(num * factor);
    if (!Number.isSafeInteger(minor)) {
      return undefined;
    }
    return minor;
  }

  /**
   * Converts integer minor units to a formatted decimal string (e.g. 1999 USD -> "19.99", 1000 JPY -> "1000").
   */
  static toMajorDecimalString(minorUnits: number, currency: string): string {
    const exponent = Currency.getExponent(currency);
    if (exponent === 0) {
      return String(minorUnits);
    }
    const factor = Currency.getFactor(currency);
    const whole = Math.trunc(minorUnits / factor);
    const fraction = Math.abs(minorUnits % factor);
    return `${whole}.${String(fraction).padStart(exponent, '0')}`;
  }

  get factor(): number {
    return Math.pow(10, this.exponent);
  }

  equals(other: Currency | string): boolean {
    if (typeof other === 'string') {
      return this.code === other.trim().toUpperCase();
    }
    return this.code === other.code;
  }

  toMinorUnits(amount: number | string): number | undefined {
    return Currency.toMinorUnits(amount, this.code);
  }

  toMajorDecimalString(minorUnits: number): string {
    return Currency.toMajorDecimalString(minorUnits, this.code);
  }

  toMajorUnits(minorUnits: number): number {
    return minorUnits / this.factor;
  }
}
