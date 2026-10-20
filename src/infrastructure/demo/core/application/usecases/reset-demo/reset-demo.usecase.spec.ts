import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { StatusCode } from '../../../../../../shared-kernel/domain/exceptions/status-code';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import {
  DemoSeedReport,
  DemoSeedRunner,
} from '../../ports/demo-seed-runner.port';
import { MockDemoSeedRunner } from '../../../../testing';
import { ResetDemoUseCase } from './reset-demo.usecase';

function report(): DemoSeedReport {
  return {
    authOnly: false,
    superAdmin: { email: 'superadmin@store.local', status: 'existing' },
    admin: { email: 'admin@store.local', status: 'existing' },
    viewer: null,
    customer: { email: 'customer@store.local', status: 'existing' },
    categories: 7,
    categoriesCreated: 0,
    products: 29,
    productsCreated: 0,
    inventory: 29,
    inventoryCreated: 0,
    cartItems: 3,
    orders: 4,
    ordersCreated: 0,
    payments: 3,
    paymentsCreated: 0,
    links: 4,
    inventorySynced: 29,
  };
}

describe('ResetDemoUseCase', () => {
  let useCase: ResetDemoUseCase;
  let runner: MockDemoSeedRunner;

  beforeEach(async () => {
    runner = new MockDemoSeedRunner();
    const module = await Test.createTestingModule({
      providers: [
        ResetDemoUseCase,
        { provide: DemoSeedRunner, useValue: runner },
      ],
    }).compile();

    useCase = module.get(ResetDemoUseCase);
  });

  it('returns seed counts when the runner succeeds', async () => {
    runner.run.mockResolvedValue(Result.success(report()));
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {
      return undefined;
    });

    const result = await useCase.execute();

    expect(runner.run).toHaveBeenCalledWith({ authOnly: false });
    expect(result).toMatchObject({
      isSuccess: true,
      value: { categories: 7, products: 29, inventorySkus: 29 },
    });
    expect(log).toHaveBeenCalledWith('demo_reset_succeeded');
    log.mockRestore();
  });

  it('returns the runner failure and logs demo_reset_failed', async () => {
    runner.run.mockResolvedValue(
      ErrorFactory.UseCaseError('Failed to seed catalog'),
    );
    const error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {
        return undefined;
      });

    const result = await useCase.execute();

    expect(result).toMatchObject({
      isFailure: true,
      error: { message: 'Failed to seed catalog' },
    });
    expect(error).toHaveBeenCalledWith('demo_reset_failed');
    expect(error.mock.calls.flat().join(' ')).not.toContain('token');
    error.mockRestore();
  });

  it('returns 409 when a reset is already running', async () => {
    let resolveRun: (
      value: Result<DemoSeedReport, UseCaseError>,
    ) => void = () => undefined;
    const pending = new Promise<Result<DemoSeedReport, UseCaseError>>(
      (resolve) => {
        resolveRun = resolve;
      },
    );
    runner.run.mockReturnValue(pending);

    const first = useCase.execute();
    const second = await useCase.execute();

    expect(second).toMatchObject({
      isFailure: true,
      error: { statusCode: StatusCode.CONFLICT },
    });
    expect(runner.run).toHaveBeenCalledTimes(1);

    resolveRun(Result.success(report()));
    const firstResult = await first;
    expect(firstResult.isSuccess).toBe(true);

    runner.run.mockResolvedValue(Result.success(report()));
    const third = await useCase.execute();
    expect(third.isSuccess).toBe(true);
    expect(runner.run).toHaveBeenCalledTimes(2);
  });

  it('returns a retryable failure when the runner throws', async () => {
    runner.run.mockRejectedValue(new Error('database unavailable'));
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {
      return undefined;
    });

    const result = await useCase.execute();

    expect(result).toMatchObject({
      isFailure: true,
      error: { message: 'Demo reset failed', retryable: true },
    });
  });
});
