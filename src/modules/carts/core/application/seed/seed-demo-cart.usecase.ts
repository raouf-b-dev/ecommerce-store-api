import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { CartRepository } from '../../domain/repositories/cart.repository';
import { Cart } from '../../domain/entities/cart';
import { DEMO_SEED_CART_ITEMS } from './demo-cart-items';

export interface SeedDemoCartProductItem {
  id: number;
  sku: string;
  name: string;
  price: number;
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
      if (product && product.id) {
        cart.addItem(
          product.id,
          product.name,
          product.price,
          seedItem.quantity,
        );
      }
    }

    const saveResult = await this.cartRepository.save(cart);
    if (saveResult.isFailure) {
      return ErrorFactory.UseCaseError(
        'Failed to save seeded cart',
        saveResult.error,
      );
    }

    return Result.success({
      cartId: saveResult.value.id!,
      itemCount: saveResult.value.itemCount,
      status: 'created',
    });
  }
}
