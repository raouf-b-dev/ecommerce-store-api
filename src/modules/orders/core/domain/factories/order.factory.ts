import { Order } from '../entities/order';
import { CheckoutCartInfo } from '../../application/ports/cart.gateway';
import { PaymentMethodType } from '../../../../../shared-kernel/domain/value-objects/payment-method';
import { ShippingAddressProps } from '../value-objects/shipping-address';
import { OrderItemProps } from '../entities/order-items';

export class OrderFactory {
  createFromCart(props: {
    cart: CheckoutCartInfo;
    userId: number;
    shippingAddress: ShippingAddressProps;
    paymentMethod: PaymentMethodType;
    customerNotes?: string;
    orderId?: number | null;
  }): Order {
    const items = props.cart.items.map((item) => {
      const prop: OrderItemProps = {
        id: 0,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.price,
        quantity: item.quantity,
      };
      return prop;
    });

    const id = props.orderId || null;
    return Order.create({
      id,
      customerId: props.userId,
      paymentMethod: props.paymentMethod,
      items,
      shippingAddress: props.shippingAddress,
      customerNotes: props.customerNotes || null,
    });
  }
}
