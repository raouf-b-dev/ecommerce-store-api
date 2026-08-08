import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FlowJob, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  OrderScheduler,
  ScheduleCheckoutProps,
} from '../../core/domain/schedulers/order.scheduler';
import { JobConfigService } from '../../../../infrastructure/jobs/job-config.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { JobNames } from '../../../../infrastructure/jobs/job-names';
import { FlowProducerService } from '../../../../infrastructure/queue/flow-producer.service';
import { CorrelationService } from '../../../../infrastructure/logging/correlation/correlation.service';

@Injectable()
export class BullMqOrderScheduler implements OrderScheduler, OnModuleInit {
  private readonly logger = new Logger(BullMqOrderScheduler.name);

  constructor(
    private readonly jobConfig: JobConfigService,
    private readonly flowProducerService: FlowProducerService,
    private readonly correlation: CorrelationService,
    @InjectQueue('checkout')
    private readonly checkoutQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.schedulePendingOrdersExpiration();
  }

  async scheduleCheckout(
    props: ScheduleCheckoutProps,
  ): Promise<Result<string, InfrastructureError>> {
    try {
      const flowId = this.jobConfig.generateJobId(JobNames.PROCESS_CHECKOUT);
      const correlationId = this.correlation.getId();

      const propsWithCorrelation = {
        ...props,
        ...(correlationId ? { correlationId } : {}),
      };

      // Single Checkout Flow: Validate -> Reserve -> Process Payment
      const flowDefinition: FlowJob = {
        name: JobNames.PROCESS_PAYMENT,
        queueName: 'checkout',
        data: { ...propsWithCorrelation, flowId },
        opts: {
          jobId: `${flowId}-process-payment`,
          ...this.jobConfig.getJobOptions(JobNames.PROCESS_PAYMENT),
        },
        children: [
          {
            name: JobNames.RESERVE_STOCK,
            queueName: 'checkout',
            data: propsWithCorrelation,
            opts: {
              jobId: `${flowId}-reserve-stock`,
              ...this.jobConfig.getJobOptions(JobNames.RESERVE_STOCK),
            },
            children: [
              {
                name: JobNames.VALIDATE_CART,
                queueName: 'checkout',
                data: propsWithCorrelation,
                opts: {
                  jobId: `${flowId}-validate-cart`,
                  ...this.jobConfig.getJobOptions(JobNames.VALIDATE_CART),
                },
              },
            ],
          },
        ],
      };

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
      const correlationId = this.correlation.getId();
      const props = {
        orderId,
        reservationId,
        cartId,
        ...(correlationId ? { correlationId } : {}),
      };

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
        'Failed to schedule post-payment flow',
        error,
      );
    }
  }

  async scheduleStockRelease(
    reservationId: number,
  ): Promise<Result<string, InfrastructureError>> {
    try {
      const jobId = this.jobConfig.generateJobId(JobNames.RELEASE_STOCK);
      const correlationId = this.correlation.getId();

      await this.flowProducerService.add({
        name: JobNames.RELEASE_STOCK,
        queueName: 'checkout',
        data: {
          reservationId,
          ...(correlationId ? { correlationId } : {}),
        },
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

  async scheduleOrderStockRelease(
    orderId: number,
  ): Promise<Result<string, InfrastructureError>> {
    try {
      const jobId = this.jobConfig.generateJobId(JobNames.RELEASE_ORDER_STOCK);
      const correlationId = this.correlation.getId();

      await this.flowProducerService.add({
        name: JobNames.RELEASE_ORDER_STOCK,
        queueName: 'checkout',
        data: {
          orderId,
          ...(correlationId ? { correlationId } : {}),
        },
        opts: {
          jobId,
          ...this.jobConfig.getJobOptions(JobNames.RELEASE_ORDER_STOCK),
        },
      });

      return Result.success(jobId);
    } catch (error) {
      return ErrorFactory.InfrastructureError(
        'Failed to schedule order stock release',
        error,
      );
    }
  }

  async schedulePendingOrdersExpiration(): Promise<
    Result<string, InfrastructureError>
  > {
    const jobName = JobNames.EXPIRE_PENDING_ORDERS;
    const cron = '*/5 * * * *'; // Every 5 minutes
    const jobId = 'expire-pending-orders-job';

    try {
      await this.checkoutQueue.add(
        jobName,
        {},
        {
          repeat: { pattern: cron },
          jobId,
        },
      );
      this.logger.log(
        'Pending orders expiration job scheduled successfully (cron: */5 * * * *)',
      );
      return Result.success(jobId);
    } catch (error) {
      this.logger.error(
        'Failed to schedule pending orders expiration job',
        error,
      );
      return ErrorFactory.InfrastructureError(
        'Failed to schedule pending orders expiration job',
        error,
      );
    }
  }
}
