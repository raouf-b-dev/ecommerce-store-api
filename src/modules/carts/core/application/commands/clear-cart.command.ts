import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

export interface ClearCartCommand {
  cartId?: number;
  callerContext?: CallerContext | null;
}
