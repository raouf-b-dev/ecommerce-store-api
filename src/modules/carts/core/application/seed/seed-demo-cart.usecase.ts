import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result, isFailure } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';
import { CartRepository } from '../../domain/repositories/cart.repository';
import { Cart } from '../../domain/entities/cart';
import { DEMO_SEED_CART_ITEMS } from './demo-cart-items';

export interface SeedDemoCartProductItem {
  id: number;
  sku: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string | null;
}

export interface SeedDemoCartInput {
  userId: number;
  products: SeedDemoCartProductItem[];
}

export interface SeededDemoCart {
  cartId: number;
  itemCount: number;
  status: 'created' | 'existing';
}

@Injectable()
export class SeedDemoCartUseCase extends UseCase<
  SeedDemoCartInput,
  SeededDemoCart,
  UseCaseError
> {
  constructor(private readonly cartRepository: CartRepository) {
    super();
  }

  async execute(
    input: SeedDemoCartInput,
  ): Promise<Result<SeededDemoCart, UseCaseError>> {
    const existingCartResult = await this.cartRepository.findByuserId(
      input.userId,
    );

    if (existingCartResult.isSuccess && !existingCartResult.value.isEmpty()) {
      return Result.success({
        cartId: existingCartResult.value.id!,
        itemCount: existingCartResult.value.itemCount,
        status: 'existing',
      });
    }

    const productMapBySku = new Map<string, SeedDemoCartProductItem>();
    for (const p of input.products) {
      if (p.sku) {
        productMapBySku.set(p.sku, p);
      }
    }

    const cart = existingCartResult.isSuccess
      ? existingCartResult.value
      : Cart.createUserCart(input.userId);

    for (const seedItem of DEMO_SEED_CART_ITEMS) {
      const product = productMapBySku.get(seedItem.sku);
      if (!product?.id) {
        continue;
      }
      const price = Money.fromMajorUnits(product.price, product.currency);
      if (isFailure(price)) {
        return price;
      }
      const addResult = cart.addItem(
        product.id,
        product.name,
        price.value.amount,
        seedItem.quantity,
        price.value.currency,
        product.imageUrl ?? undefined,
      );
      if (isFailure(addResult)) {
        return addResult;
      }
    }

    const saveResult = await this.cartRepository.save(cart);
    if (isFailure(saveResult)) {
      return saveResult;
    }

    return Result.success({
      cartId: saveResult.value.id!,
      itemCount: saveResult.value.itemCount,
      status: 'created',
    });
  }
}
