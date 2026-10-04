import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { ReleaseCheckoutStockUseCase } from '../../core/application/usecases/release-checkout-stock/release-checkout-stock.usecase';
import { InventoryReservationGateway } from '../../core/application/ports/inventory-reservation.gateway';
import { CancelOrderUseCase } from '../../core/application/usecases/cancel-order/cancel-order.usecase';
import { QueueEventsService } from '../../../../infrastructure/queue/queue-events.service';
import { parseCheckoutCompensationJobData } from './checkout-compensation-job-data';
import { JobNames } from '../../../../infrastructure/jobs/job-names';

@Injectable()
export class CheckoutFailureListener implements OnModuleInit {
  private readonly logger = new Logger(CheckoutFailureListener.name);

  constructor(
    @InjectQueue('checkout') private readonly checkoutQueue: Queue,
    private readonly queueEventsService: QueueEventsService,
    private readonly releaseStockUseCase: ReleaseCheckoutStockUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
    private readonly inventoryGateway: InventoryReservationGateway,
  ) {}

  onModuleInit(): void {
    this.queueEventsService.onFailed(
      'checkout',
      async ({ jobId, failedReason }) => {
        this.logger.warn(
          `Job ${jobId} failed with reason: ${failedReason}. Triggering compensation...`,
        );

        try {
          const job = await this.checkoutQueue.getJob(jobId);
          if (!job) {
            this.logger.error(`Could not find job ${jobId} for compensation`);
            return;
          }

          if (job.name === JobNames.REFUND_PAYMENT) {
            this.logger.debug(
              `Job ${jobId} is a refund payment job. Skipping checkout compensation.`,
            );
            return;
          }

          const jobData = parseCheckoutCompensationJobData(job.data);
          let { reservationId } = jobData;
          const { orderId } = jobData;

          if (!reservationId && orderId) {
            const reservationResult =
              await this.inventoryGateway.getOrderReservations(orderId);
            if (
              reservationResult.isSuccess &&
              reservationResult.value.length > 0
            ) {
              reservationId = reservationResult.value[0].id || undefined;
              if (reservationId) {
                this.logger.log(
                  `Retrieved reservationId ${reservationId} for order ${orderId}`,
                );
              }
            }
          }

          if (orderId) {
            this.logger.log(`Cancelling order ${orderId}...`);
            const cancelResult = await this.cancelOrderUseCase.execute({
              orderId,
              isSagaCompensation: true,
            });
            if (cancelResult.isFailure) {
              this.logger.error(
                `Failed to cancel order ${orderId}: ${cancelResult.error.message}`,
              );
            }
          }

          if (reservationId) {
            this.logger.log(`Releasing stock reservation ${reservationId}...`);
            const releaseResult =
              await this.releaseStockUseCase.execute(reservationId);
            if (releaseResult.isFailure) {
              this.logger.error(
                `Failed to release reservation ${reservationId}: ${releaseResult.error.message}`,
              );
            }
          }

          this.logger.log(`Compensation completed for job ${jobId}`);
        } catch (error) {
          this.logger.error(
            `Error during compensation for job ${jobId}:`,
            error,
          );
        }
      },
    );

    this.logger.log('Checkout failure listener initialized');
  }
}
