import { Test } from '@nestjs/testing';
import { EnvConfigService } from '../../config/env-config.service';
import { IS_PUBLIC_KEY } from '../../guards/decorators/public.decorator';
import { DEMO_RESET_LIMIT } from '../throttler/throttle.constants';
import { Result } from '../../shared-kernel/domain/result';
import { MockEnvConfigService } from '../../testing';
import { ResetDemoUseCase } from './core/application/usecases/reset-demo/reset-demo.usecase';
import { DemoController } from './demo.controller';

describe('DemoController', () => {
  const execute: jest.MockedFunction<ResetDemoUseCase['execute']> = jest.fn();
  let controller: DemoController;

  beforeEach(async () => {
    execute.mockReset();
    const module = await Test.createTestingModule({
      controllers: [DemoController],
      providers: [
        { provide: ResetDemoUseCase, useValue: { execute } },
        { provide: EnvConfigService, useClass: MockEnvConfigService },
      ],
    }).compile();
    controller = module.get(DemoController);
  });

  it('delegates reset to the use case', async () => {
    const payload = Result.success({
      categories: 7,
      products: 29,
      inventorySkus: 29,
    });
    execute.mockResolvedValue(payload);

    await expect(controller.reset()).resolves.toBe(payload);
    expect(execute).toHaveBeenCalledWith();
  });

  it('is public and rate-limited', () => {
    const handler = DemoController.prototype.reset;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(
      DEMO_RESET_LIMIT,
    );
  });
});
