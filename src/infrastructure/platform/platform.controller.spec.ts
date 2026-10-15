import { Test } from '@nestjs/testing';
import { PlatformController } from './platform.controller';
import { GetPlatformConfigQuery } from './get-platform-config.query';
import { Result } from '../../shared-kernel/domain/result';
import { ResultAssertionHelper } from '../../testing';

describe('PlatformController', () => {
  it('delegates getConfig to GetPlatformConfigQuery', async () => {
    const execute: jest.MockedFunction<GetPlatformConfigQuery['execute']> =
      jest.fn();
    const config = {
      defaultCurrency: 'USD',
      defaultCurrencyExponent: 2,
      supportedCurrencies: ['USD'],
    };
    execute.mockReturnValue(Result.success(config));

    const module = await Test.createTestingModule({
      controllers: [PlatformController],
      providers: [{ provide: GetPlatformConfigQuery, useValue: { execute } }],
    }).compile();

    const controller = module.get(PlatformController);
    const result = controller.getConfig();

    expect(execute).toHaveBeenCalledTimes(1);
    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual(config);
  });
});
