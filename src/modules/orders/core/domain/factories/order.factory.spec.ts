// src/modules/orders/domain/factories/order.factory.spec.ts
import { UpdateOrderDto } from '../../../primary-adapters/dto/update-order.dto';
import {
  AggregatedOrderInput,
  AggregatedUpdateInput,
  OrderFactory,
} from './order.factory';
import { OrderStatus } from '../value-objects/order-status';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { CreateOrderDtoTestFactory } from '../../../testing/factories/create-order-dto.factory';
import { PaymentMethodType } from '../../../../payments/core/domain';

describe('OrderFactory', () => {
  let factory: OrderFactory;

  beforeEach(() => {
    factory = new OrderFactory();
  });

  describe('createFromDto', () => {
    it('aggregates duplicate items by productId when creating from DTO', () => {
      const dto = CreateOrderDtoTestFactory.createMultiItemDto([1, 1, 2]);
      // Manually adjust quantities to test aggregation
      dto.items[0].quantity = 2;
      dto.items[1].quantity = 3;
      dto.items[2].quantity = 1;

      const aggregated = factory.createFromDto(dto);

      expect(aggregated.items).toHaveLength(2);
      const p1 = aggregated.items.find((i) => i.productId === 1)!;
      const p2 = aggregated.items.find((i) => i.productId === 2)!;
      expect(p1.quantity).toBe(5);
      expect(p2.quantity).toBe(1);

      // Verify original DTO is unchanged
      expect(dto.items[0].quantity).toBe(2);
      expect(dto.items[1].quantity).toBe(3);
    });

    it('throws when creating from DTO with no items', () => {
      const dto = CreateOrderDtoTestFactory.createMockDto();
      dto.items = []; // Make it invalid

      expect(() => factory.createFromDto(dto)).toThrow(
        'Order must have at least one item.',
      );
    });

    it('returns aggregated items and does not compute totalPrice (create)', () => {
      const dto = CreateOrderDtoTestFactory.createMultiItemDto([1, 2]);

      const aggregated: AggregatedOrderInput = factory.createFromDto(dto);

      expect(aggregated.items).toHaveLength(2);
      expect(aggregated.items[0].productId).toBe(1);
      expect(aggregated.items[1].productId).toBe(2);
    });

    it('handles single item order', () => {
      const dto = CreateOrderDtoTestFactory.createMockDto();

      const aggregated = factory.createFromDto(dto);

      expect(aggregated.items).toHaveLength(1);
      expect(aggregated.customerId).toEqual(dto.customerId);
      expect(aggregated.shippingAddress).toEqual(dto.shippingAddress);
      expect(aggregated.paymentMethod).toEqual(dto.paymentMethod);
    });

    it('preserves customer notes when provided', () => {
      const notes = 'Handle with care';
      const dto = CreateOrderDtoTestFactory.createWithNotesDto(notes);

      const aggregated = factory.createFromDto(dto);

      expect(aggregated.customerNotes).toBe(notes);
    });

    it('handles different payment methods', () => {
      const creditCardDto = CreateOrderDtoTestFactory.createCreditCardDto();
      const codDto = CreateOrderDtoTestFactory.createCashOnDeliveryDto();

      const ccAggregated = factory.createFromDto(creditCardDto);
      const codAggregated = factory.createFromDto(codDto);

      expect(ccAggregated.paymentMethod).toBe(PaymentMethodType.CREDIT_CARD);
      expect(codAggregated.paymentMethod).toBe(
        PaymentMethodType.CASH_ON_DELIVERY,
      );
    });
  });

  describe('updateFromDto', () => {
    it('updateFromDto returns input unchanged when items are not provided', () => {
      const updateDto: UpdateOrderDto = {};

      const result = factory.updateFromDto(
        updateDto,
        OrderStatus.PENDING_PAYMENT,
      ) as AggregatedUpdateInput;

      expect(result.items).toBeUndefined();
    });

    it('aggregates duplicate items by productId when updating from DTO', () => {
      const updateDto: UpdateOrderDto = {
        items: [
          { productId: 1, quantity: 2 },
          { productId: 1, quantity: 4 },
          { productId: 2, quantity: 3 },
        ],
      };

      const aggregated = factory.updateFromDto(
        updateDto,
        OrderStatus.PENDING_PAYMENT,
      ) as AggregatedUpdateInput;

      expect(aggregated.items).toHaveLength(2);
      const px = aggregated.items?.find((i) => i.productId === 1);
      expect(px).toBeDefined();
      expect(px!.quantity).toBe(6);

      const py = aggregated.items?.find((i) => i.productId === 2);
      expect(py).toBeDefined();
      expect(py!.quantity).toBe(3);
    });

    it('updateFromDto returns a DomainError when order status is not awaiting payment', () => {
      const updateDto: UpdateOrderDto = {
        items: [{ productId: 2, quantity: 1 }],
      };

      const result = factory.updateFromDto(updateDto, OrderStatus.DELIVERED);

      expect(result instanceof DomainError).toBeTruthy();
      expect((result as DomainError).message).toBe(
        'Only orders awaiting payment can be updated.',
      );
    });

    it('allows update when status is PENDING_PAYMENT', () => {
      const updateDto: UpdateOrderDto = {
        items: [{ productId: 2, quantity: 1 }],
      };

      const result = factory.updateFromDto(
        updateDto,
        OrderStatus.PENDING_PAYMENT,
      );

      expect(result instanceof DomainError).toBeFalsy();
      expect((result as AggregatedUpdateInput).items).toHaveLength(1);
    });

    it('returns DomainError for SHIPPED status', () => {
      const updateDto: UpdateOrderDto = {
        items: [{ productId: 2, quantity: 1 }],
      };

      const result = factory.updateFromDto(updateDto, OrderStatus.SHIPPED);

      expect(result instanceof DomainError).toBeTruthy();
    });

    it('returns DomainError for CANCELLED status', () => {
      const updateDto: UpdateOrderDto = {
        items: [{ productId: 2, quantity: 1 }],
      };

      const result = factory.updateFromDto(updateDto, OrderStatus.CANCELLED);

      expect(result instanceof DomainError).toBeTruthy();
    });

    it('handles empty items array in update', () => {
      const updateDto: UpdateOrderDto = {
        items: [],
      };

      const result = factory.updateFromDto(
        updateDto,
        OrderStatus.PENDING_PAYMENT,
      );

      expect((result as AggregatedUpdateInput).items).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('handles large quantities in aggregation', () => {
      const dto = CreateOrderDtoTestFactory.createMockDto();
      dto.items = [
        { productId: 1, quantity: 1000 },
        { productId: 1, quantity: 500 },
      ];

      const aggregated = factory.createFromDto(dto);

      const p1 = aggregated.items.find((i) => i.productId === 1)!;
      expect(p1.quantity).toBe(1500);
    });

    it('preserves customerId field', () => {
      const dto = CreateOrderDtoTestFactory.createMockDto();

      const aggregated = factory.createFromDto(dto);

      expect(aggregated.customerId).toBe(dto.customerId);
    });
  });
});
