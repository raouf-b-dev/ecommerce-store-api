import { OrderItem } from './order-items';

describe('OrderItem', () => {
  const validProps = {
    id: 1,
    productId: 10,
    productName: 'Wireless Mouse',
    sku: 'SKU-MOUSE',
    imageUrl: 'https://cdn.example.com/mouse.png',
    unitPrice: 25.5,
    quantity: 2,
  };

  describe('construction', () => {
    describe('when props are valid', () => {
      it('creates item with trimmed name and computed lineTotal', () => {
        const item = new OrderItem({
          ...validProps,
          productName: '  Wireless Mouse  ',
          sku: '  SKU-MOUSE  ',
          imageUrl: '  https://cdn.example.com/mouse.png  ',
        });

        expect(item.id).toBe(1);
        expect(item.productId).toBe(10);
        expect(item.productName).toBe('Wireless Mouse');
        expect(item.sku).toBe('SKU-MOUSE');
        expect(item.imageUrl).toBe('https://cdn.example.com/mouse.png');
        expect(item.unitPrice).toBe(25.5);
        expect(item.quantity).toBe(2);
        expect(item.lineTotal).toBe(51);
      });

      it('defaults optional fields when omitted', () => {
        const item = OrderItem.fromProps({
          id: null,
          productId: 10,
          productName: 'Wireless Mouse',
          unitPrice: 10,
          quantity: 1,
        });

        expect(item.id).toBeNull();
        expect(item.sku).toBeNull();
        expect(item.imageUrl).toBeNull();
        expect(item.lineTotal).toBe(10);
      });
    });

    describe('when productId is missing', () => {
      it.each([0, null as unknown as number, undefined as unknown as number])(
        'throws when productId is %s',
        (productId) => {
          expect(
            () =>
              new OrderItem({
                ...validProps,
                productId,
              }),
          ).toThrow('Product ID is required');
        },
      );
    });

    describe('when productName is blank', () => {
      it.each([
        '',
        '   ',
        null as unknown as string,
        undefined as unknown as string,
      ])('throws when productName is %s', (productName) => {
        expect(
          () =>
            new OrderItem({
              ...validProps,
              productName,
            }),
        ).toThrow('Product name is required');
      });
    });
  });

  describe('lineTotal', () => {
    it.each([
      { unitPrice: 10, quantity: 1, expected: 10 },
      { unitPrice: 12.5, quantity: 4, expected: 50 },
      { unitPrice: 0, quantity: 3, expected: 0 },
    ])(
      'computes unitPrice %s × quantity %s as %s',
      ({ unitPrice, quantity, expected }) => {
        const item = new OrderItem({
          ...validProps,
          unitPrice,
          quantity,
        });

        expect(item.lineTotal).toBe(expected);
      },
    );
  });

  describe('toPrimitives', () => {
    it('returns persistence snapshot including lineTotal', () => {
      const item = new OrderItem(validProps);

      expect(item.toPrimitives()).toEqual({
        id: 1,
        productId: 10,
        productName: 'Wireless Mouse',
        sku: 'SKU-MOUSE',
        imageUrl: 'https://cdn.example.com/mouse.png',
        unitPrice: 25.5,
        quantity: 2,
        lineTotal: 51,
      });
    });
  });
});
