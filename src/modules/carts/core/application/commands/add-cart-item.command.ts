import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

export interface AddCartItemCommand {
  cartId: number;
  productId: number;
  quantity: number;
  callerContext: CallerContext | null;
}
