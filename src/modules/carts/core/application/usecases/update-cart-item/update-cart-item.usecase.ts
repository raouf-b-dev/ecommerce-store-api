import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UpdateCartItemDto } from '../../../../primary-adapters/dto/update-cart-item.dto';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { InventoryGateway } from '../../ports/inventory.gateway';
import { INVENTORY_GATEWAY } from '../../../../carts.token';

@Injectable()
export class UpdateCartItemUseCase extends UseCase<
  { cartId: number; itemId: number; dto: UpdateCartItemDto },
  ICart,
  UseCaseError
> {
  constructor(
    private readonly cartRepository: CartRepository,
    @Inject(INVENTORY_GATEWAY)
    private readonly inventoryGateway: InventoryGateway,
  ) {
    super();
  }

  async execute(input: {
    cartId: number;
    itemId: number;
    dto: UpdateCartItemDto;
  }): Promise<Result<ICart, UseCaseError>> {
    const { cartId, itemId, dto } = input;
    try {
      const cartResult = await this.cartRepository.findById(cartId);

      if (isFailure(cartResult)) return cartResult;

      const cart = cartResult.value;
      if (!cart) {
        return ErrorFactory.UseCaseError(`Cart with id ${cartId} not found`);
      }

      const item = cart.findItemById(itemId);
      if (!item) {
        return ErrorFactory.UseCaseError(
          `Item with id ${itemId} not found in cart`,
        );
      }

      // Check stock availability
      const stockCheckResult = await this.inventoryGateway.checkStock(
        item.productId,
        dto.quantity,
      );

      if (isFailure(stockCheckResult)) {
        return ErrorFactory.UseCaseError(stockCheckResult.error.message);
      }

      if (!stockCheckResult.value.isAvailable) {
        return ErrorFactory.UseCaseError(
          `Insufficient stock for product. Available: ${stockCheckResult.value.availableQuantity}`,
        );
      }

      const updateResult = cart.updateItemQuantity(
        item.productId,
        dto.quantity,
      );

      if (isFailure(updateResult)) return updateResult;

      const saveResult = await this.cartRepository.update(cart);

      if (isFailure(saveResult)) return saveResult;

      return Result.success(cart.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
