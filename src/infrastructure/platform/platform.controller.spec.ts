import { PlatformController } from './platform.controller';
import { MockEnvConfigService } from '../../testing/mocks/env-config.service.mock';

describe('PlatformController', () => {
  it('returns default and supported currencies from env config', () => {
    const mockEnvConfig = new MockEnvConfigService();
    const controller = new PlatformController(mockEnvConfig);
    const config = controller.getConfig();

    expect(config).toEqual({
      defaultCurrency: 'USD',
      defaultCurrencyExponent: 2,
      supportedCurrencies: ['USD'],
    });
  });
});
