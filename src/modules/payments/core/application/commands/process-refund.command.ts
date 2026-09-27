import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

export interface ProcessRefundCommand {
  paymentId: number;
  amount: number;
  reason?: string;
  callerContext?: CallerContext | null;
}
