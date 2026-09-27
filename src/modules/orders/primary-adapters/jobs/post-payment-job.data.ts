import { SchedulePostPaymentProps } from '../../core/domain/schedulers/order.scheduler';

export type PostPaymentJobData = SchedulePostPaymentProps & {
  flowId: string;
};
