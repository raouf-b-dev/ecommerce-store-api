import { Injectable } from '@nestjs/common';
import { FlowJob } from 'bullmq';
import {
  OrderScheduler,
  ScheduleCheckoutProps,
} from '../../domain/schedulers/order.scheduler';
import { JobConfigService } from '../../../../core/infrastructure/jobs/job-config.service';
import { Result } from '../../../../core/domain/result';
import { InfrastructureError } from '../../../../core/errors/infrastructure-error';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { JobNames } from '../../../../core/infrastructure/jobs/job-names';
import { FlowProducerService } from '../../../../core/infrastructure/queue/flow-producer.service';
import { PaymentMethodType } from '../../../payments/domain/value-objects/payment-method';

@Injectable()
export class BullMqOrderScheduler implements OrderScheduler {
  constructor(
    private readonly jobConfig: JobConfigService,
    private readonly flowProducerService: FlowProducerService,
  ) {}

  async scheduleCheckout(
    props: ScheduleCheckoutProps,
  ): Promise<Result<string, InfrastructureError>> {
    try {
      const flowId = this.jobConfig.generateJobId(JobNames.PROCESS_CHECKOUT);
      const isOnline = this.isOnlinePayment(props.paymentMethod);

      let flowDefinition: FlowJob;

      if (isOnline) {
        // Online Flow: Validate -> Reserve -> Process Payment
        // Order is already created in CheckoutUseCase
        flowDefinition = {
          name: JobNames.PROCESS_PAYMENT,
          queueName: 'checkout',
          data: { ...props, flowId },
          opts: {
            jobId: `${flowId}-process-payment`,
            ...this.jobConfig.getJobOptions(JobNames.PROCESS_PAYMENT),
          },
          children: [
            {
              name: JobNames.RESERVE_STOCK,
              queueName: 'checkout',
              data: props,
              opts: {
                jobId: `${flowId}-reserve-stock`,
                ...this.jobConfig.getJobOptions(JobNames.RESERVE_STOCK),
              },
              children: [
                {
                  name: JobNames.VALIDATE_CART,
                  queueName: 'checkout',
                  data: props,
                  opts: {
                    jobId: `${flowId}-validate-cart`,
                    ...this.jobConfig.getJobOptions(JobNames.VALIDATE_CART),
                  },
                },
              ],
            },
          ],
        };
      } else {
        // COD Flow: Validate -> Reserve Stock
        // Order is already created in CheckoutUseCase with PENDING_CONFIRMATION status
        // Stops here - awaits manual confirmation via phone call
        // schedulePostConfirmation() is called after manual confirmation
        flowDefinition = {
          name: JobNames.RESERVE_STOCK,
          queueName: 'checkout',
          data: { ...props, flowId },
          opts: {
            jobId: `${flowId}-reserve-stock`,
            ...this.jobConfig.getJobOptions(JobNames.RESERVE_STOCK),
          },
          children: [
            {
              name: JobNames.VALIDATE_CART,
              queueName: 'checkout',
              data: props,
              opts: {
                jobId: `${flowId}-validate-cart`,
                ...this.jobConfig.getJobOptions(JobNames.VALIDATE_CART),
              },
            },
          ],
        };
      }

      const flow = await this.flowProducerService.add(flowDefinition);

      if (!flow.job.id) {
        return ErrorFactory.InfrastructureError(
          'Failed to schedule checkout flow',
        );
      }

      return Result.success(flowId);
    } catch (error) {
      return ErrorFactory.InfrastructureError(
        'Failed to schedule checkout flow',
        error,
      );
    }
  }

  async schedulePostPayment(
    orderId: number,
    reservationId: number,
    cartId: number,
  ): Promise<Result<string, InfrastructureError>> {
    try {
      const flowId = this.jobConfig.generateJobId(JobNames.PROCESS_CHECKOUT);
      const props = { orderId, reservationId, cartId };

      const flowDefinition: FlowJob = {
        name: JobNames.FINALIZE_CHECKOUT,
        queueName: 'checkout',
        data: { ...props, flowId },
        opts: {
          jobId: `${flowId}-finalize`,
          ...this.jobConfig.getJobOptions(JobNames.FINALIZE_CHECKOUT),
        },
        children: [
          {
            name: JobNames.CLEAR_CART,
            queueName: 'checkout',
            data: props,
            opts: {
              jobId: `${flowId}-clear-cart`,
              ...this.jobConfig.getJobOptions(JobNames.CLEAR_CART),
            },
            children: [
              {
                name: JobNames.CONFIRM_RESERVATION,
                queueName: 'checkout',
                data: props,
                opts: {
                  jobId: `${flowId}-confirm-reservation`,
                  ...this.jobConfig.getJobOptions(JobNames.CONFIRM_RESERVATION),
                },
                children: [
                  {
                    name: JobNames.CONFIRM_ORDER,
                    queueName: 'checkout',
                    data: props,
                    opts: {
                      jobId: `${flowId}-confirm-order`,
                      ...this.jobConfig.getJobOptions(JobNames.CONFIRM_ORDER),
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const flow = await this.flowProducerService.add(flowDefinition);
      return Result.success(flowId);
    } catch (error) {
      return ErrorFactory.InfrastructureError(
        'Failed to schedule post-payment flow',
        error,
      );
    }
  }

  /**
   * Schedule post-confirmation flow for COD orders.
   * Called after manual confirmation (e.g., phone call with customer).
   * Triggers: CONFIRM_RESERVATION -> CLEAR_CART -> FINALIZE
   */
  async schedulePostConfirmation(
    orderId: number,
    reservationId: number,
    cartId: number,
  ): Promise<Result<string, InfrastructureError>> {
    try {
      const flowId = this.jobConfig.generateJobId(JobNames.PROCESS_CHECKOUT);
      const props = { orderId, reservationId, cartId };

      const flowDefinition: FlowJob = {
        name: JobNames.FINALIZE_CHECKOUT,
        queueName: 'checkout',
        data: { ...props, flowId },
        opts: {
          jobId: `${flowId}-finalize`,
          ...this.jobConfig.getJobOptions(JobNames.FINALIZE_CHECKOUT),
        },
        children: [
          {
            name: JobNames.CLEAR_CART,
            queueName: 'checkout',
            data: props,
            opts: {
              jobId: `${flowId}-clear-cart`,
              ...this.jobConfig.getJobOptions(JobNames.CLEAR_CART),
            },
            children: [
              {
                name: JobNames.CONFIRM_RESERVATION,
                queueName: 'checkout',
                data: props,
                opts: {
                  jobId: `${flowId}-confirm-reservation`,
                  ...this.jobConfig.getJobOptions(JobNames.CONFIRM_RESERVATION),
                },
              },
            ],
          },
        ],
      };

      const flow = await this.flowProducerService.add(flowDefinition);
      return Result.success(flowId);
    } catch (error) {
      return ErrorFactory.InfrastructureError(
        'Failed to schedule post-confirmation flow',
        error,
      );
    }
  }

  private isOnlinePayment(method: PaymentMethodType): boolean {
    return (
      method === PaymentMethodType.CREDIT_CARD ||
      method === PaymentMethodType.DEBIT_CARD ||
      method === PaymentMethodType.PAYPAL ||
      method === PaymentMethodType.DIGITAL_WALLET
    );
  }

  async scheduleStockRelease(
    reservationId: number,
  ): Promise<Result<string, InfrastructureError>> {
    try {
      const jobId = this.jobConfig.generateJobId(JobNames.RELEASE_STOCK);

      await this.flowProducerService.add({
        name: JobNames.RELEASE_STOCK,
        queueName: 'checkout',
        data: { reservationId },
        opts: {
          jobId,
          ...this.jobConfig.getJobOptions(JobNames.RELEASE_STOCK),
        },
      });

      return Result.success(jobId);
    } catch (error) {
      return ErrorFactory.InfrastructureError(
        'Failed to schedule stock release',
        error,
      );
    }
  }
}
