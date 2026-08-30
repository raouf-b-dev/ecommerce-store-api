import { MockOrderRepository } from 'src/modules/orders/testing';
import { LinkDemoOrderPaymentsUseCase } from './link-demo-order-payments.usecase';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { Order } from '../../domain/entities/order';
import { DEMO_SEED_ORDERS } from './demo-orders';
import { Result } from '../../../../../shared-kernel/domain/result';

describe('LinkDemoOrderPaymentsUseCase', () => {
  let useCase: LinkDemoOrderPaymentsUseCase;
  let mockOrderRepository: MockOrderRepository;

  const createdAt = new Date('2026-08-24T12:00:00.000Z');

  beforeEach(() => {
    mockOrderRepository = new MockOrderRepository();
    useCase = new LinkDemoOrderPaymentsUseCase(mockOrderRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('associates payment id and refreshes order timestamps', async () => {
    const order = Order.create({
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
    order.confirmPayment(1);

    mockOrderRepository.mockSuccessfulFind(order.toPrimitives());
    mockOrderRepository.save.mockImplementation((o: Order) =>
      Promise.resolve(Result.success(o)),
    );

    const result = await useCase.execute([
      { orderId: 50, paymentId: 99, createdAt },
    ]);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value[0]).toEqual({ orderId: 50, paymentId: 99 });
    const saved = mockOrderRepository.save.mock.calls[0][0];
    expect(saved.paymentId).toBe(99);
    expect(saved.createdAt.toISOString()).toBe(createdAt.toISOString());
  });
});
