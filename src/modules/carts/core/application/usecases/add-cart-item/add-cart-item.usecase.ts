import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { CartRepository } from '../../../domain/repositories/cart.repository';
import {
  isFailure,
  Result,
} from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CartInventoryGateway } from '../../ports/inventory.gateway';
import { CartProductGateway } from '../../ports/product.gateway';
import { INVENTORY_GATEWAY, PRODUCT_GATEWAY } from '../../../../carts.token';
import { CartOwnershipValidator } from '../../services/cart-ownership.validator';
import { AddCartItemCommand } from '../../commands/add-cart-item.command';

@Injectable()
export class AddCartItemUseCase extends UseCase<
  AddCartItemCommand,
  void,
  UseCaseError
> {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly cartOwnershipValidator: CartOwnershipValidator,
    @Inject(PRODUCT_GATEWAY)
    private readonly productGateway: CartProductGateway,
    @Inject(INVENTORY_GATEWAY)
    private readonly inventoryGateway: CartInventoryGateway,
  ) {
    super();
  }

  async execute(
    command: AddCartItemCommand,
  ): Promise<Result<void, UseCaseError>> {
    const { cartId, productId, quantity, callerContext } = command;

    if (!cartId) {
      return ErrorFactory.UseCaseError('cartId is required');
    }

    const cartResult = await this.cartRepository.findByIdForUpdate(cartId);

    if (isFailure(cartResult)) return cartResult;

    const { entity: cart, expectedVersion } = cartResult.value;
    if (!cart) {
      return ErrorFactory.UseCaseError(`Cart with id ${cartId} not found`);
    }

    const ownershipResult = this.cartOwnershipValidator.validate(
      cart,
      callerContext,
    );
    if (isFailure(ownershipResult)) return ownershipResult;

    const productResult = await this.productGateway.findById(productId);
    if (isFailure(productResult)) return productResult;

    const product = productResult.value;
    if (!product) {
      return ErrorFactory.UseCaseError(
        `Product with id ${productId} not found`,
      );
    }

    const stockResult = await this.inventoryGateway.checkStock(
      productId,
      quantity,
    );

    if (isFailure(stockResult)) {
      return ErrorFactory.UseCaseError(stockResult.error.message);
    }

    if (!stockResult.value.isAvailable) {
      return ErrorFactory.UseCaseError(
        `Insufficient stock for product ${product.name}`,
      );
    }

    const addResult = cart.addItem(
      product.id!,
      product.name,
      product.price,
      quantity,
    );
    if (isFailure(addResult)) return addResult;

    const saveResult = await this.cartRepository.save(cart, expectedVersion);
    if (isFailure(saveResult)) return saveResult;

    return Result.success(undefined);
  }
}
