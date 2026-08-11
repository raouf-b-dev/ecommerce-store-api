import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

export interface RemoveCartItemCommand {
  cartId?: number;
  productId: number;
  callerContext?: CallerContext | null;
}
