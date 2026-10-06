import { OrderFactory, OrderCartItemInput } from './order.factory';
import { PaymentMethodType } from '../../../../../shared-kernel/domain/value-objects/payment-method';
import { OrderTestFactory } from 'src/modules/orders/testing';

describe('OrderFactory', () => {
  const factory = new OrderFactory();

  const cartItem = (imageUrl: string | null): OrderCartItemInput => ({
    productId: 7,
    productName: 'Headphones',
    imageUrl,
    price: 19999,
    quantity: 1,
    currency: 'USD',
  });

  const createFromItems = (items: OrderCartItemInput[]) =>
    factory.createFromCart({
      cart: { items },
      userId: 1,
      shippingAddress: OrderTestFactory.createShippingAddressProps(),
      paymentMethod: PaymentMethodType.STRIPE,
    });

  it('snapshots the cart line image on the order line', () => {
    const imageUrl = 'https://api.example.com/media/demo/v1/elec-anc-001.webp';

    const order = createFromItems([cartItem(imageUrl)]);

    expect(order.items[0].imageUrl).toBe(imageUrl);
  });

  it('keeps a null image when the cart line has none', () => {
    const order = createFromItems([cartItem(null)]);

    expect(order.items[0].imageUrl).toBeNull();
  });
});
