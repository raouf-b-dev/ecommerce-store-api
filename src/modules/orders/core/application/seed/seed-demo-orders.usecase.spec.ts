import { SeedDemoOrdersUseCase } from './seed-demo-orders.usecase';
import { MockOrderRepository } from '../../../testing/mocks/order-repository.mock';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { Order } from '../../domain/entities/order';
import { OrderStatus } from '../../domain/value-objects/order-status';
import { DEMO_SEED_ORDERS } from './demo-orders';

describe('SeedDemoOrdersUseCase', () => {
  let useCase: SeedDemoOrdersUseCase;
  let mockOrderRepository: MockOrderRepository;

  const dummyProducts = [
    { id: 1, name: 'Headphones', sku: 'ELEC-ANC-001', price: 199.99 },
    { id: 2, name: 'Mouse', sku: 'ELEC-EWM-005', price: 24.95 },
    { id: 3, name: 'Hoodie', sku: 'CLOT-OCH-001', price: 55 },
    { id: 4, name: 'Jacket', sku: 'CLOT-CDJ-002', price: 68 },
    { id: 5, name: 'Planter', sku: 'HOME-SCP-001', price: 32.5 },
    { id: 6, name: 'Book', sku: 'BOOK-ACC-001', price: 28.5 },
    { id: 7, name: 'Yoga Mat', sku: 'SPOR-EYM-001', price: 29.99 },
  ];

  beforeEach(() => {
    mockOrderRepository = new MockOrderRepository();
    useCase = new SeedDemoOrdersUseCase(mockOrderRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should skip seeding if orders already exist for user', async () => {
    const existingOrder = Order.create({
      id: 50,
      userId: 1,
      paymentMethod: DEMO_SEED_ORDERS[0].paymentMethod,
      items: [
        {
          id: 1,
          productId: 1,
          productName: 'Prod',
          sku: 'ELEC-ANC-001',
          unitPrice: 100,
          quantity: 1,
        },
      ],
      shippingAddress: {
        id: 1,
        ...DEMO_SEED_ORDERS[0].shippingAddress,
      },
      customerNotes: 'Notes',
    });

    mockOrderRepository.mockSuccessfulList([existingOrder.toPrimitives()]);

    const result = await useCase.execute({
      userId: 1,
      products: dummyProducts,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.length).toBe(1);
    expect(result.value[0].seedStatus).toBe('existing');
    expect(mockOrderRepository.save).not.toHaveBeenCalled();
  });

  it('should seed orders with target statuses when no orders exist', async () => {
    mockOrderRepository.mockSuccessfulList([]);
    mockOrderRepository.mockSuccessfulSave(100);

    const result = await useCase.execute({
      userId: 1,
      products: dummyProducts,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.length).toBe(DEMO_SEED_ORDERS.length);
    expect(result.value[0].seedStatus).toBe('created');
    expect(result.value[0].status).toBe(OrderStatus.CONFIRMED);
    expect(result.value[1].status).toBe(OrderStatus.SHIPPED);
    expect(result.value[2].status).toBe(OrderStatus.DELIVERED);
    expect(result.value[3].status).toBe(OrderStatus.PENDING_PAYMENT);
    expect(mockOrderRepository.save).toHaveBeenCalledTimes(
      DEMO_SEED_ORDERS.length,
    );
  });
});
