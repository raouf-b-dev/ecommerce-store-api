import { GetPlatformConfigQuery } from './get-platform-config.query';
import { MockEnvConfigService } from '../../testing/mocks/env-config.service.mock';
import { ResultAssertionHelper } from '../../testing';
import { DomainError } from '../../shared-kernel/domain/exceptions/domain.error';

describe('GetPlatformConfigQuery', () => {
  let mockEnvConfig: MockEnvConfigService;
  let query: GetPlatformConfigQuery;

  beforeEach(() => {
    mockEnvConfig = new MockEnvConfigService();
    query = new GetPlatformConfigQuery(mockEnvConfig);
  });

  it('returns a success Result with exponent 2 for USD', () => {
    mockEnvConfig.setMockConfig({
      store: {
        defaultCurrency: 'USD',
        supportedCurrencies: ['USD'],
      },
    });

    const result = query.execute();

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      defaultCurrency: 'USD',
      defaultCurrencyExponent: 2,
      supportedCurrencies: ['USD'],
    });
  });

  it('returns a success Result with exponent 3 for KWD', () => {
    mockEnvConfig.setMockConfig({
      store: {
        defaultCurrency: 'KWD',
        supportedCurrencies: ['KWD', 'USD'],
      },
    });

    const result = query.execute();

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      defaultCurrency: 'KWD',
      defaultCurrencyExponent: 3,
      supportedCurrencies: ['KWD', 'USD'],
    });
  });

  it('returns a failure Result for an unknown currency code', () => {
    mockEnvConfig.setMockConfig({
      store: {
        defaultCurrency: 'UNKNOWN',
        supportedCurrencies: ['USD'],
      },
    });

    const result = query.execute();

    ResultAssertionHelper.assertResultFailure(
      result,
      'Currency must be a 3-letter code (ISO 4217)',
      DomainError,
    );
  });
});
