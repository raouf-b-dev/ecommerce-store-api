import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JobNames } from '../../core/infrastructure/jobs/job-names';
import { ValidateCartStep } from './presentation/jobs/validate-cart.job';
import { ReserveStockStep } from './presentation/jobs/reserve-stock.job';
import { CreateOrderStep } from './presentation/jobs/create-order.job';
import { ProcessPaymentStep } from './presentation/jobs/process-payment.job';
import { ConfirmReservationStep } from './presentation/jobs/confirm-reservation.job';
import { ClearCartStep } from './presentation/jobs/clear-cart.job';
import { ReleaseStockStep } from './presentation/jobs/release-stock.job';
import { CancelOrderStep } from './presentation/jobs/cancel-order.job';
import { RefundPaymentStep } from './presentation/jobs/refund-payment.job';
import { FinalizeCheckoutStep } from './presentation/jobs/finalize-checkout.job';

@Processor('checkout')
@Injectable()
export class OrdersProcessor extends WorkerHost {
  private readonly logger = new Logger(OrdersProcessor.name);

  constructor(
    private readonly validateCartStep: ValidateCartStep,
    private readonly reserveStockStep: ReserveStockStep,
    private readonly createOrderStep: CreateOrderStep,
    private readonly processPaymentStep: ProcessPaymentStep,
    private readonly confirmReservationStep: ConfirmReservationStep,
    private readonly clearCartStep: ClearCartStep,
    private readonly releaseStockStep: ReleaseStockStep,
    private readonly cancelOrderStep: CancelOrderStep,
    private readonly refundPaymentStep: RefundPaymentStep,
    private readonly finalizeCheckoutStep: FinalizeCheckoutStep,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job ${job.name} (ID: ${job.id})...`);

    switch (job.name) {
      case JobNames.VALIDATE_CART:
        return this.validateCartStep.handle(job);
      case JobNames.RESERVE_STOCK:
        return this.reserveStockStep.handle(job);
      case JobNames.CREATE_ORDER:
        return this.createOrderStep.handle(job);
      case JobNames.PROCESS_PAYMENT:
        return this.processPaymentStep.handle(job);
      case JobNames.CONFIRM_RESERVATION:
        return this.confirmReservationStep.handle(job);
      case JobNames.CLEAR_CART:
        return this.clearCartStep.handle(job);
      case JobNames.FINALIZE_CHECKOUT:
        return this.finalizeCheckoutStep.handle(job);

      // Compensations
      case JobNames.RELEASE_STOCK:
        return this.releaseStockStep.handle(job);
      case JobNames.CANCEL_ORDER:
        return this.cancelOrderStep.handle(job);
      case JobNames.REFUND_PAYMENT:
        return this.refundPaymentStep.handle(job);

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
