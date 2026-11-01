import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ErrorCode } from '../../../../../../shared-kernel/domain/exceptions/error-code';
import { ErrorKind } from '../../../../../../shared-kernel/domain/exceptions/error-kind';
import { CartInventoryGateway } from '../../ports/inventory.gateway';
import { INVENTORY_GATEWAY } from '../../../../carts.token';
import { CartOwnershipValidator } from '../../services/cart-ownership.validator';
import { cartNotFoundError } from '../../services/cart-not-found';
import { UpdateCartItemCommand } from '../../commands/update-cart-item.command';

@Injectable()
export class UpdateCartItemUseCase extends UseCase<
  UpdateCartItemCommand,
  void,
  UseCaseError
> {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly cartOwnershipValidator: CartOwnershipValidator,
    @Inject(INVENTORY_GATEWAY)
    private readonly inventoryGateway: CartInventoryGateway,
  ) {
    super();
  }

  async execute(
    command: UpdateCartItemCommand,
  ): Promise<Result<void, UseCaseError>> {
    const { cartId, itemId, quantity, callerContext } = command;
    const cartResult = await this.cartRepository.findByIdForUpdate(cartId);

    if (isFailure(cartResult)) {
      if (cartResult.error.kind === ErrorKind.NOT_FOUND) {
        return cartNotFoundError(cartId);
      }
      return cartResult;
    }

    const { entity: cart, expectedVersion } = cartResult.value;
    if (!cart) {
      return cartNotFoundError(cartId);
    }

    const ownershipResult = this.cartOwnershipValidator.validate(
      cart,
      callerContext,
    );

    if (isFailure(ownershipResult)) return ownershipResult;

    const item = cart.findItemById(itemId);
    if (!item) {
      return ErrorFactory.UseCaseError(
        `Item with id ${itemId} not found in cart`,
        {
          kind: ErrorKind.NOT_FOUND,
          code: ErrorCode.CART_ITEM_NOT_FOUND,
        },
      );
    }

    // Check stock availability
    const stockCheckResult = await this.inventoryGateway.checkStock(
      item.productId,
      quantity,
    );

    if (isFailure(stockCheckResult)) {
      return stockCheckResult;
    }

    if (!stockCheckResult.value.isAvailable) {
      return ErrorFactory.UseCaseError(
        `Insufficient stock for product. Available: ${stockCheckResult.value.availableQuantity}`,
      );
    }

    const updateResult = cart.updateItemQuantity(item.productId, quantity);

    if (isFailure(updateResult)) return updateResult;

    const saveResult = await this.cartRepository.save(cart, expectedVersion);

    if (isFailure(saveResult)) return saveResult;

    return Result.success<void>(undefined);
  }
}
