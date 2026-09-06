import { PaymentMethodType } from '../../../../../shared-kernel/domain/value-objects/payment-method';
import { OrderStatus } from '../../domain/value-objects/order-status';
import { ShippingAddressProps } from '../../domain/value-objects/shipping-address';

export interface DemoSeedOrderItem {
  sku: string;
  quantity: number;
}

export interface DemoSeedOrder {
  referenceName: string;
  items: DemoSeedOrderItem[];
  shippingAddress: Omit<ShippingAddressProps, 'id'>;
  paymentMethod: PaymentMethodType;
  userNotes: string;
  targetStatus: OrderStatus;
}

export const DEMO_SEED_ORDERS: DemoSeedOrder[] = [
  {
    referenceName: 'Confirmed Electronics Order',
    items: [
      { sku: 'ELEC-ANC-001', quantity: 1 },
      { sku: 'ELEC-MBK-004', quantity: 1 },
    ],
    shippingAddress: {
      firstName: 'Jane',
      lastName: 'Doe',
      street: '123 Tech Boulevard',
      street2: 'Suite 400',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'us',
      phone: '+14155550199',
      deliveryInstructions: 'Leave at front desk.',
    },
    paymentMethod: PaymentMethodType.STRIPE,
    userNotes: 'Standard delivery requested.',
    targetStatus: OrderStatus.CONFIRMED,
  },
  {
    referenceName: 'Shipped Apparel Order',
    items: [
      { sku: 'CLOT-OCH-001', quantity: 2 },
      { sku: 'CLOT-CDJ-002', quantity: 1 },
    ],
    shippingAddress: {
      firstName: 'Jane',
      lastName: 'Doe',
      street: '456 Oak Avenue',
      street2: null,
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'us',
      phone: '+15125550123',
      deliveryInstructions: 'Ring doorbell.',
    },
    paymentMethod: PaymentMethodType.STRIPE,
    userNotes: 'Gift wrap requested.',
    targetStatus: OrderStatus.SHIPPED,
  },
  {
    referenceName: 'Delivered Home & Books Order',
    items: [
      { sku: 'HOME-SCP-001', quantity: 1 },
      { sku: 'BOOK-ACC-001', quantity: 1 },
    ],
    shippingAddress: {
      firstName: 'Jane',
      lastName: 'Doe',
      street: '789 Maple Drive',
      street2: 'Apt 2B',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      country: 'us',
      phone: '+12065550188',
      deliveryInstructions: null,
    },
    paymentMethod: PaymentMethodType.STRIPE,
    userNotes: 'Delivered successfully.',
    targetStatus: OrderStatus.DELIVERED,
  },
  {
    referenceName: 'Pending Payment Order',
    items: [{ sku: 'SPOR-EYM-001', quantity: 1 }],
    shippingAddress: {
      firstName: 'Jane',
      lastName: 'Doe',
      street: '100 Pine Street',
      street2: null,
      city: 'Denver',
      state: 'CO',
      postalCode: '80202',
      country: 'us',
      phone: '+13035550144',
      deliveryInstructions: null,
    },
    paymentMethod: PaymentMethodType.STRIPE,
    userNotes: 'Awaiting payment confirmation.',
    targetStatus: OrderStatus.PENDING_PAYMENT,
  },
];
