import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

export interface CancelOrderCommand {
  orderId: number;
  reason?: string;
  isSagaCompensation?: boolean;
  callerContext?: CallerContext | null;
}
