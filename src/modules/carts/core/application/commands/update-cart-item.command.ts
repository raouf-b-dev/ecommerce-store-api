import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

export interface UpdateCartItemCommand {
  cartId: number;
  itemId: number;
  quantity: number;
  callerContext: CallerContext | null;
}
