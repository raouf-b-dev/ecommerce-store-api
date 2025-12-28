import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { ReleaseStockUseCase } from '../../../inventory/application/release-stock/release-stock.usecase';
import { CancelOrderUseCase } from '../../application/usecases/cancel-order/cancel-order.usecase';
import { ProcessRefundUseCase } from '../../../payments/application/usecases/process-refund/process-refund.usecase';
import { QueueEventsService } from '../../../../core/infrastructure/queue/queue-events.service';
import { GetOrderReservationsUseCase } from '../../../inventory/application/get-order-reservations/get-order-reservations.usecase';

@Injectable()
export class CheckoutFailureListener implements OnModuleInit {
  private readonly logger = new Logger(CheckoutFailureListener.name);

  constructor(
    @InjectQueue('checkout') private readonly checkoutQueue: Queue,
    private readonly queueEventsService: QueueEventsService,
    private readonly releaseStockUseCase: ReleaseStockUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
    private readonly processRefundUseCase: ProcessRefundUseCase,
    private readonly getOrderReservationsUseCase: GetOrderReservationsUseCase,
  ) {}

  async onModuleInit() {
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

          let { reservationId } = job.data;
          const { orderId, paymentId, orderTotal } = job.data;

          if (!reservationId && orderId) {
            const reservationResult =
              await this.getOrderReservationsUseCase.execute(orderId);
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

          if (paymentId) {
            this.logger.log(`Refunding payment ${paymentId}...`);
            const refundResult = await this.processRefundUseCase.execute({
              id: paymentId,
              dto: {
                amount: orderTotal || 0,
                reason: `Checkout compensation: ${failedReason}`,
              },
            });
            if (refundResult.isFailure) {
              this.logger.error(
                `Failed to refund payment ${paymentId}: ${refundResult.error.message}`,
              );
            }
          }

          if (orderId) {
            this.logger.log(`Cancelling order ${orderId}...`);
            const cancelResult = await this.cancelOrderUseCase.execute(orderId);
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
