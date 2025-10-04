import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { GetOrderController } from './presentation/controllers/get-order/get-order.controller';
import { CreateOrderController } from './presentation/controllers/create-order/create-order.controller';
import { CreateOrderDto } from './presentation/dto/create-order.dto';
import { OrderStatus } from './domain/value-objects/order-status';
import { IOrder } from './domain/interfaces/order.interface';
import { ListOrdersController } from './presentation/controllers/list-orders/list-orders.controller';
import { CancelOrderController } from './presentation/controllers/cancel-order/cancel-order.controller';
import { PaymentMethod } from './domain/value-objects/payment-method';
import { PaymentStatus } from './domain/value-objects/payment-status';

describe('OrdersController', () => {
  let controller: OrdersController;
  let createOrderController: CreateOrderController;
  let getOrderController: GetOrderController;
  let listOrdersController: ListOrdersController;
  let cancelOrderController: CancelOrderController;

  let id: string;
  let mockOrder: IOrder;
  let cancelledOrder: IOrder;
  let mockCreateOrderDto: CreateOrderDto;

  beforeEach(async () => {
    id = 'OR00000001';

    mockOrder = {
      // Basic identifiers
      id: 'OR0001',
      customerId: 'CUST1',
      paymentInfoId: 'PAY001',
      shippingAddressId: 'ADDR001',

      // Order items
      items: [
        {
          id: 'item-1',
          productId: 'PR1',
          productName: 'P1',
          quantity: 1,
          unitPrice: 10,
          lineTotal: 10,
        },
      ],

      // Customer information
      customerInfo: {
        customerId: 'CUST1',
        email: 'customer@example.com',
        phone: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
      },

      // Payment information
      paymentInfo: {
        id: 'PAY001',
        method: PaymentMethod.CREDIT_CARD,
        amount: 15,
        status: PaymentStatus.PENDING,
        transactionId: 'TXN123456',
        notes: 'Awaiting payment confirmation',
      },

      // Shipping address
      shippingAddress: {
        id: 'ADDR001',
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        phone: '+1234567890',
      },

      // Pricing
      subtotal: 10,
      shippingCost: 5,
      totalPrice: 15,

      // Order status and timestamps
      status: OrderStatus.PENDING,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),

      // Optional customer notes
      customerNotes: 'Please ring doorbell upon delivery',
    };

    cancelledOrder = {
      ...mockOrder,
      status: OrderStatus.CANCELLED,
    };

    mockCreateOrderDto = {
      customerInfo: {
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      },
      items: [
        {
          productId: 'PR3',
          quantity: 1,
        },
      ],
      shippingAddress: {
        firstName: 'Jane',
        lastName: 'Smith',
        street: '456 Oak Avenue',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        country: 'US',
      },
      paymentInfo: {
        method: PaymentMethod.CASH_ON_DELIVERY,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: CreateOrderController,
          useValue: {
            handle: jest.fn().mockResolvedValue(mockOrder),
          },
        },
        {
          provide: GetOrderController,
          useValue: {
            handle: jest.fn().mockResolvedValue(mockOrder),
          },
        },
        {
          provide: ListOrdersController,
          useValue: {
            handle: jest.fn().mockResolvedValue([mockOrder]),
          },
        },
        {
          provide: CancelOrderController,
          useValue: {
            handle: jest.fn().mockResolvedValue(cancelledOrder),
          },
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    createOrderController = module.get<CreateOrderController>(
      CreateOrderController,
    );
    getOrderController = module.get<GetOrderController>(GetOrderController);
    listOrdersController =
      module.get<ListOrdersController>(ListOrdersController);
    cancelOrderController = module.get<CancelOrderController>(
      CancelOrderController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call CreateOrderController.handle when createOrder is called and return its result', async () => {
    const res = await controller.createOrder(mockCreateOrderDto);
    expect(createOrderController.handle).toHaveBeenCalledWith(
      mockCreateOrderDto,
    );
    expect(res).toEqual(mockOrder);
  });

  it('should call GetOrderController.handle when findOne is called and return its result', async () => {
    const res = await controller.findOne(id);
    expect(getOrderController.handle).toHaveBeenCalledWith(id);
    expect(res).toEqual(mockOrder);
  });

  it('should call ListOrdersController.handle when findAll is called and return its result', async () => {
    const query = {} as any;
    const res = await controller.findAll(query);
    expect(listOrdersController.handle).toHaveBeenCalledWith(query);
    expect(res).toEqual([mockOrder]);
  });

  it('should call CancelOrderController.handle when cancelOrder is called and return its result', async () => {
    const res = await controller.cancelOrder(id);
    expect(cancelOrderController.handle).toHaveBeenCalledWith(id);
    expect(res).toEqual(cancelledOrder);
  });
});
