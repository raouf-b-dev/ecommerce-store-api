import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { UpdateCartItemDto } from '../../../presentation/dto/update-cart-item.dto';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import { isFailure, Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { CheckStockUseCase } from '../../../../inventory/application/check-stock/check-stock.usecase';

@Injectable()
export class UpdateCartItemUseCase extends UseCase<
  { cartId: string; itemId: string; dto: UpdateCartItemDto },
  ICart,
  UseCaseError
> {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly checkStockUseCase: CheckStockUseCase,
  ) {
    super();
  }

  async execute(input: {
    cartId: string;
    itemId: string;
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

      // We need to find the product ID from the item ID because updateItemQuantity uses productId
      // Or we should add updateItemQuantityById to Cart entity.
      // Let's check Cart entity again.

      const item = cart.findItemById(itemId);
      if (!item) {
        return ErrorFactory.UseCaseError(
          `Item with id ${itemId} not found in cart`,
        );
      }

      // Check stock availability
      const stockCheckResult = await this.checkStockUseCase.execute({
        productId: item.productId,
        quantity: dto.quantity,
      });

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
