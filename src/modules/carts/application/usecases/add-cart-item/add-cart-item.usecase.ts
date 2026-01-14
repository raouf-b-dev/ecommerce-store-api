import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { AddCartItemDto } from '../../../presentation/dto/add-cart-item.dto';
import { ICart } from '../../../domain/interfaces/cart.interface';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import { ProductRepository } from '../../../../products/domain/repositories/product-repository';
import { isFailure, Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { InventoryGateway } from '../../ports/inventory.gateway';
import { INVENTORY_GATEWAY } from '../../../carts.token';

@Injectable()
export class AddCartItemUseCase extends UseCase<
  { cartId: number; dto: AddCartItemDto },
  ICart,
  UseCaseError
> {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository,
    @Inject(INVENTORY_GATEWAY)
    private readonly inventoryGateway: InventoryGateway,
  ) {
    super();
  }

  async execute(input: {
    cartId: number;
    dto: AddCartItemDto;
  }): Promise<Result<ICart, UseCaseError>> {
    const { cartId, dto } = input;
    try {
      const cartResult = await this.cartRepository.findById(cartId);

      if (isFailure(cartResult)) return cartResult;

      const cart = cartResult.value;
      if (!cart) {
        return ErrorFactory.UseCaseError(`Cart with id ${cartId} not found`);
      }

      const productResult = await this.productRepository.findById(
        dto.productId,
      );

      if (isFailure(productResult)) return productResult;

      const product = productResult.value;
      if (!product) {
        return ErrorFactory.UseCaseError(
          `Product with id ${dto.productId} not found`,
        );
      }

      // Check stock availability
      const stockCheckResult = await this.inventoryGateway.checkStock(
        dto.productId,
        dto.quantity,
      );

      if (isFailure(stockCheckResult)) {
        return ErrorFactory.UseCaseError(stockCheckResult.error.message);
      }

      if (!stockCheckResult.value.isAvailable) {
        return ErrorFactory.UseCaseError(
          `Insufficient stock for product ${product.name}. Available: ${stockCheckResult.value.availableQuantity}`,
        );
      }

      const addResult = cart.addItem(
        product.id!,
        product.name,
        product.price,
        dto.quantity,
        undefined,
      );

      if (isFailure(addResult)) return addResult;

      const saveResult = await this.cartRepository.update(cart);

      if (isFailure(saveResult)) return saveResult;

      return Result.success(cart.toPrimitives());
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected use case error', error);
    }
  }
}
