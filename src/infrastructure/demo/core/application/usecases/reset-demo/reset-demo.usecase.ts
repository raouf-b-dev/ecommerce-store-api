import { Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ErrorKind } from '../../../../../../shared-kernel/domain/exceptions/error-kind';
import { DemoSeedRunner } from '../../ports/demo-seed-runner.port';

export interface DemoResetResult {
  categories: number;
  products: number;
  inventorySkus: number;
}

/**
 * Reconciles the hosted demo by running the same seed pipeline as `db:seed`.
 * One reset at a time per process; a second call while the first is in
 * flight returns 409. The lock is in-memory (single-instance demo).
 */
@Injectable()
export class ResetDemoUseCase extends UseCase<
  void,
  DemoResetResult,
  UseCaseError
> {
  private readonly logger = new Logger(ResetDemoUseCase.name);
  private running = false;

  constructor(private readonly demoSeedRunner: DemoSeedRunner) {
    super();
  }

  async execute(): Promise<Result<DemoResetResult, UseCaseError>> {
    if (this.running) {
      return ErrorFactory.UseCaseError('Demo reset is already running', {
        kind: ErrorKind.CONFLICT,
      });
    }

    this.running = true;
    try {
      const result = await this.demoSeedRunner.run({ authOnly: false });
      if (result.isFailure) {
        this.logger.error('demo_reset_failed');
        return result;
      }

      this.logger.log('demo_reset_succeeded');
      return Result.success({
        categories: result.value.categories,
        products: result.value.products,
        inventorySkus: result.value.inventorySynced,
      });
    } catch (error) {
      this.logger.error('demo_reset_failed');
      return ErrorFactory.UseCaseError('Demo reset failed', {
        cause: error,
        kind: ErrorKind.INTERNAL,
        retryable: true,
      });
    } finally {
      this.running = false;
    }
  }
}
