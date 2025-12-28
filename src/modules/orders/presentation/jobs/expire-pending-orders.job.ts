import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { isFailure } from '../../../../core/domain/result';
import { ExpirePendingOrdersUseCase } from '../../application/usecases/expire-pending-orders/expire-pending-orders.usecase';

@Injectable()
export class ExpirePendingOrdersJob {
  private readonly logger = new Logger(ExpirePendingOrdersJob.name);
  private readonly EXPIRATION_MINUTES = 30;

  constructor(
    private readonly expirePendingOrdersUseCase: ExpirePendingOrdersUseCase,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron(): Promise<void> {
    this.logger.log('Running pending orders expiration check...');

    try {
      const result = await this.expirePendingOrdersUseCase.execute({
        expirationMinutes: this.EXPIRATION_MINUTES,
      });

      if (isFailure(result)) {
        this.logger.error('Failed to expire pending orders:', result.error);
        return;
      }

      this.logger.log(
        `Pending orders expiration check completed. Cancelled ${result.value.cancelledCount} orders.`,
      );
    } catch (error) {
      this.logger.error('Error during pending orders expiration:', error);
    }
  }
}
