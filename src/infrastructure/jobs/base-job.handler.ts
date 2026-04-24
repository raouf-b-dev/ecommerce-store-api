import { Job, UnrecoverableError } from 'bullmq';
import { Logger } from '@nestjs/common';
import { Result } from 'src/shared-kernel/domain/result';
import { AppError } from 'src/shared-kernel/domain/exceptions/app.error';
import { CorrelationService } from 'src/infrastructure/logging/correlation/correlation.service';

export abstract class BaseJobHandler<TData, TResult> {
  protected abstract readonly logger: Logger;

  /**
   * Subclasses MAY override this to provide the CorrelationService.
   * When provided, the handler will restore the correlation context
   * from `job.data.correlationId` before executing.
   */
  protected getCorrelationService(): CorrelationService | undefined {
    return undefined;
  }

  protected abstract onExecute(
    job: Job<TData>,
  ): Promise<Result<TResult, AppError>>;

  async handle(job: Job<TData>): Promise<TResult> {
    const jobName = job.name || this.constructor.name;
    const jobId = job.id || 'unknown';
    const attemptsMade = job.attemptsMade || 0;
    const maxAttempts = job.opts?.attempts || 1;

    // Restore correlation context from job data if available.
    const correlationService = this.getCorrelationService();
    const correlationId = (job.data as Record<string, unknown>)
      ?.correlationId as string | undefined;

    if (correlationService && correlationId) {
      return correlationService.run(correlationId, () =>
        this.executeWithLogging(job, jobName, jobId, attemptsMade, maxAttempts),
      );
    }

    return this.executeWithLogging(
      job,
      jobName,
      jobId,
      attemptsMade,
      maxAttempts,
    );
  }

  private async executeWithLogging(
    job: Job<TData>,
    jobName: string,
    jobId: string,
    attemptsMade: number,
    maxAttempts: number,
  ): Promise<TResult> {
    // Log with retry context
    if (attemptsMade > 0) {
      this.logger.log(
        `Starting job ${jobName} (ID: ${jobId}) - Retry attempt ${attemptsMade}/${maxAttempts}`,
      );
    } else {
      this.logger.log(`Starting job ${jobName} (ID: ${jobId})...`);
    }

    try {
      const result = await this.onExecute(job);

      if (result.isFailure) {
        const willRetry =
          result.error.retryable !== false && attemptsMade < maxAttempts - 1;
        const retryInfo = willRetry
          ? ` (will retry, attempt ${attemptsMade + 1}/${maxAttempts})`
          : ' (no retry - non-retryable or max attempts reached)';

        this.logger.error(
          `Job ${jobName} (ID: ${jobId}) failed: ${result.error.message}${retryInfo}`,
        );

        if (result.error.retryable === false) {
          throw new UnrecoverableError(result.error.message);
        }
        throw new Error(result.error.message);
      }

      this.logger.log(`Job ${jobName} (ID: ${jobId}) completed successfully.`);
      return result.value;
    } catch (error) {
      if (error instanceof UnrecoverableError || error instanceof Error) {
        throw error;
      }
      this.logger.error(
        `Job ${jobName} (ID: ${jobId}) failed with unexpected error: ${String(error)}`,
      );
      throw new Error(String(error));
    }
  }
}
