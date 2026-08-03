import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { ICart } from '../../../domain/interfaces/cart.interface';
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
import { CallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { CartOwnershipValidator } from '../../services/cart-ownership.validator';

export interface AddCartItemInput {
  productId: number;
  quantity: number;
}

export interface AddCartItemUseCaseInput {
  cartId: number;
  input: AddCartItemInput;
  callerContext: CallerContext | null;
}

@Injectable()
export class AddCartItemUseCase extends UseCase<
  AddCartItemUseCaseInput,
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
    input: AddCartItemUseCaseInput,
  ): Promise<Result<void, UseCaseError>> {
    const { cartId, input: addInput, callerContext } = input;
    const cartResult = await this.cartRepository.findByIdForUpdate(cartId);

    if (isFailure(cartResult)) return cartResult;

    const { entity: cart, expectedVersion } = cartResult.value;
    if (!cart) {
      return ErrorFactory.UseCaseError(`Cart with id ${cartId} not found`);
    }

    const ownershipResult = await this.cartOwnershipValidator.validate(
      cart,
      callerContext,
    );

    if (isFailure(ownershipResult)) return ownershipResult;

    const productResult = await this.productGateway.findById(
      addInput.productId,
    );

    if (isFailure(productResult)) return productResult;

    const product = productResult.value;
    if (!product) {
      return ErrorFactory.UseCaseError(
        `Product with id ${addInput.productId} not found`,
      );
    }

    // Check stock availability
    const stockCheckResult = await this.inventoryGateway.checkStock(
      addInput.productId,
      addInput.quantity,
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
      addInput.quantity,
      undefined,
    );

    if (isFailure(addResult)) return addResult;

    const saveResult = await this.cartRepository.save(cart, expectedVersion);

    if (isFailure(saveResult)) return saveResult;

    return Result.success<void>(undefined);
  }
}
