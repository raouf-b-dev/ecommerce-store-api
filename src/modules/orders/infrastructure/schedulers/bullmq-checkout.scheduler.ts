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
                    name: JobNames.PROCESS_PAYMENT,
                    queueName: 'checkout',
                    data: props,
                    opts: {
                      jobId: `${flowId}-process-payment`,
                      ...this.jobConfig.getJobOptions(JobNames.PROCESS_PAYMENT),
                    },
                    children: [
                      {
                        name: JobNames.CREATE_ORDER,
                        queueName: 'checkout',
                        data: props,
                        opts: {
                          jobId: `${flowId}-create-order`,
                          ...this.jobConfig.getJobOptions(
                            JobNames.CREATE_ORDER,
                          ),
                        },
                        children: [
                          {
                            name: JobNames.RESERVE_STOCK,
                            queueName: 'checkout',
                            data: props,
                            opts: {
                              jobId: `${flowId}-reserve-stock`,
                              ...this.jobConfig.getJobOptions(
                                JobNames.RESERVE_STOCK,
                              ),
                            },
                            children: [
                              {
                                name: JobNames.VALIDATE_CART,
                                queueName: 'checkout',
                                data: props,
                                opts: {
                                  jobId: `${flowId}-validate-cart`,
                                  ...this.jobConfig.getJobOptions(
                                    JobNames.VALIDATE_CART,
                                  ),
                                },
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
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
}
