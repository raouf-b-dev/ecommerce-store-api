// src/modules/orders/application/usecases/create-order-from-cart/create-order-from-cart.usecase.ts
import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { GetCartUseCase } from '../../../../carts/application/usecases/get-cart/get-cart.usecase';
import { PaymentMethodType } from '../../../../payments/domain';
import { OrderFactory } from '../../../domain/factories/order.factory';
import { IOrder } from '../../../domain/interfaces/order.interface';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { ShippingAddressProps } from '../../../domain/value-objects/shipping-address';

export interface CreateOrderFromCartDto {
  cartId: string;
  userId: string;
  shippingAddress: ShippingAddressProps;
  paymentMethod: PaymentMethodType;
  customerNotes?: string;
}

@Injectable()
export class CreateOrderFromCartUseCase extends UseCase<
  CreateOrderFromCartDto,
  IOrder,
  UseCaseError
> {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderFactory: OrderFactory,
    private readonly getCartUseCase: GetCartUseCase,
  ) {
    super();
  }

  async execute(
    dto: CreateOrderFromCartDto,
  ): Promise<Result<IOrder, UseCaseError>> {
    try {
      // 1. Get Cart
      const cartResult = await this.getCartUseCase.execute(dto.cartId);
      if (isFailure(cartResult)) {
        return ErrorFactory.UseCaseError(
          'Failed to fetch cart',
          cartResult.error,
        );
      }
      const cart = cartResult.value;

      if (cart.items.length === 0) {
        return ErrorFactory.UseCaseError('Cannot create order from empty cart');
      }

      const order = this.orderFactory.createFromCart({
        cart,
        userId: dto.userId,
        shippingAddress: dto.shippingAddress,
        paymentMethod: dto.paymentMethod,
        customerNotes: dto.customerNotes,
      });

      // 3. Save Order
      const saveResult = await this.orderRepository.save(order);
      if (isFailure(saveResult)) {
        return ErrorFactory.UseCaseError(
          'Failed to save order',
          saveResult.error,
        );
      }

      return Result.success(saveResult.value);
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error creating order',
        error,
      );
    }
  }
}
