// src/modules/orders/domain/factories/order.factory.spec.ts
import { UpdateOrderDto } from '../../presentation/dto/update-order.dto';
import {
  AggregatedOrderInput,
  AggregatedUpdateInput,
  OrderFactory,
} from './order.factory';
import { OrderStatus } from '../value-objects/order-status';
import { DomainError } from '../../../../core/errors/domain.error';
import { CreateOrderDtoTestFactory } from '../../testing/factories/create-order-dto.factory';

describe('OrderFactory', () => {
  let factory: OrderFactory;

  beforeEach(() => {
    factory = new OrderFactory();
  });

  describe('createFromDto', () => {
    it('aggregates duplicate items by productId when creating from DTO', () => {
      const dto = CreateOrderDtoTestFactory.createMultiItemDto([
        'P1',
        'P1',
        'P2',
      ]);
      // Manually adjust quantities to test aggregation
      dto.items[0].quantity = 2;
      dto.items[1].quantity = 3;
      dto.items[2].quantity = 1;

      const aggregated = factory.createFromDto(dto);

      expect(aggregated.items).toHaveLength(2);
      const p1 = aggregated.items.find((i) => i.productId === 'P1')!;
      const p2 = aggregated.items.find((i) => i.productId === 'P2')!;
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
      const dto = CreateOrderDtoTestFactory.createMultiItemDto(['P3', 'P4']);

      const aggregated: AggregatedOrderInput = factory.createFromDto(dto);

      expect(aggregated.items).toHaveLength(2);
      expect(aggregated.items[0].productId).toBe('P3');
      expect(aggregated.items[1].productId).toBe('P4');
    });

    it('handles single item order', () => {
      const dto = CreateOrderDtoTestFactory.createMockDto();

      const aggregated = factory.createFromDto(dto);

      expect(aggregated.items).toHaveLength(1);
      expect(aggregated.customerInfo).toEqual(dto.customerInfo);
      expect(aggregated.shippingAddress).toEqual(dto.shippingAddress);
      expect(aggregated.paymentInfo).toEqual(dto.paymentInfo);
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

      expect(ccAggregated.paymentInfo.method).toBe('credit_card');
      expect(codAggregated.paymentInfo.method).toBe('cash_on_delivery');
    });
  });

  describe('updateFromDto', () => {
    it('updateFromDto returns input unchanged when items are not provided', () => {
      const updateDto: UpdateOrderDto = {};

      const result = factory.updateFromDto(
        updateDto,
        OrderStatus.PENDING,
      ) as AggregatedUpdateInput;

      expect(result.items).toBeUndefined();
    });

    it('aggregates duplicate items by productId when updating from DTO', () => {
      const updateDto: UpdateOrderDto = {
        items: [
          { productId: 'PX', quantity: 2 },
          { productId: 'PX', quantity: 4 },
          { productId: 'PY', quantity: 3 },
        ],
      };

      const aggregated = factory.updateFromDto(
        updateDto,
        OrderStatus.PENDING,
      ) as AggregatedUpdateInput;

      expect(aggregated.items).toHaveLength(2);
      const px = aggregated.items?.find((i) => i.productId === 'PX');
      expect(px).toBeDefined();
      expect(px!.quantity).toBe(6);

      const py = aggregated.items?.find((i) => i.productId === 'PY');
      expect(py).toBeDefined();
      expect(py!.quantity).toBe(3);
    });

    it('updateFromDto returns a DomainError when order status is not PENDING', () => {
      const updateDto: UpdateOrderDto = {
        items: [{ productId: 'PZ', quantity: 1 }],
      };

      const result = factory.updateFromDto(updateDto, OrderStatus.DELIVERED);

      expect(result instanceof DomainError).toBeTruthy();
      expect((result as DomainError).message).toBe(
        'Only orders with status PENDING can be updated.',
      );
    });

    it('allows update when status is PENDING', () => {
      const updateDto: UpdateOrderDto = {
        items: [{ productId: 'PZ', quantity: 1 }],
      };

      const result = factory.updateFromDto(updateDto, OrderStatus.PENDING);

      expect(result instanceof DomainError).toBeFalsy();
      expect((result as AggregatedUpdateInput).items).toHaveLength(1);
    });

    it('returns DomainError for SHIPPED status', () => {
      const updateDto: UpdateOrderDto = {
        items: [{ productId: 'PZ', quantity: 1 }],
      };

      const result = factory.updateFromDto(updateDto, OrderStatus.SHIPPED);

      expect(result instanceof DomainError).toBeTruthy();
    });

    it('returns DomainError for CANCELLED status', () => {
      const updateDto: UpdateOrderDto = {
        items: [{ productId: 'PZ', quantity: 1 }],
      };

      const result = factory.updateFromDto(updateDto, OrderStatus.CANCELLED);

      expect(result instanceof DomainError).toBeTruthy();
    });

    it('handles empty items array in update', () => {
      const updateDto: UpdateOrderDto = {
        items: [],
      };

      const result = factory.updateFromDto(updateDto, OrderStatus.PENDING);

      expect((result as AggregatedUpdateInput).items).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('handles large quantities in aggregation', () => {
      const dto = CreateOrderDtoTestFactory.createMockDto();
      dto.items = [
        { productId: 'P1', quantity: 1000 },
        { productId: 'P1', quantity: 500 },
      ];

      const aggregated = factory.createFromDto(dto);

      const p1 = aggregated.items.find((i) => i.productId === 'P1')!;
      expect(p1.quantity).toBe(1500);
    });

    it('preserves all customer info fields', () => {
      const dto = CreateOrderDtoTestFactory.createMockDto();
      dto.customerInfo = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      const aggregated = factory.createFromDto(dto);

      expect(aggregated.customerInfo.email).toBe('test@example.com');
      expect(aggregated.customerInfo.firstName).toBe('Test');
      expect(aggregated.customerInfo.lastName).toBe('User');
    });
  });
});
