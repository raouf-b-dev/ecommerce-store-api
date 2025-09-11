import { OrderFactory } from './order.factory';

describe('OrderFactory', () => {
  let factory: OrderFactory;

  beforeEach(() => {
    factory = new OrderFactory();
  });

  it('aggregates duplicate items by productId when creating from DTO', () => {
    const dto = {
      customerId: 'cust_1',
      items: [
        { productId: 'P1', quantity: 2 },
        { productId: 'P1', quantity: 3 },
        { productId: 'P2', quantity: 1 },
      ],
      status: 'pending',
    } as any;

    const aggregated = factory.createFromDto(dto);

    expect(aggregated.items).toHaveLength(2);
    const p1 = aggregated.items.find((i) => i.productId === 'P1')!;
    const p2 = aggregated.items.find((i) => i.productId === 'P2')!;
    expect(p1.quantity).toBe(5);
    expect(p2.quantity).toBe(1);

    // original dto should not be mutated
    expect(dto.items[0].quantity).toBe(2);
    expect(dto.items[1].quantity).toBe(3);
  });

  it('throws when creating from DTO with no items', () => {
    const dto = {
      customerId: 'cust_2',
      items: [],
      status: 'pending',
    } as any;

    expect(() => factory.createFromDto(dto)).toThrow(
      'Order must have at least one item.',
    );
  });

  it('returns aggregated items and does not compute totalPrice (create)', () => {
    const dto = {
      customerId: 'cust_3',
      items: [
        { productId: 'P3', quantity: 1 },
        { productId: 'P4', quantity: 2 },
      ],
      status: 'pending',
    } as any;

    const aggregated = factory.createFromDto(dto);
    expect(aggregated.items).toHaveLength(2);
    expect((aggregated as any).totalPrice).toBeUndefined();
  });

  it('updateFromDto returns input unchanged when items are not provided', () => {
    const updateDto = { status: 'paid' } as any;
    const result = factory.updateFromDto(updateDto);
    expect(result.status).toBe('paid');
    expect((result as any).items).toBeUndefined();
  });

  it('aggregates duplicate items by productId when updating from DTO', () => {
    const updateDto = {
      status: 'pending',
      items: [
        { productId: 'PX', quantity: 2 },
        { productId: 'PX', quantity: 4 },
        { productId: 'PY', quantity: 3 },
      ],
    } as any;

    const aggregated = factory.updateFromDto(updateDto);
    expect(aggregated.items).toHaveLength(2);
    const px = aggregated.items?.find((i) => i.productId === 'PX');
    expect(px).toBeDefined();
    expect(px!.quantity).toBe(6);
  });
});
