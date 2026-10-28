import {
  MockPaymentQueryService,
  PaymentDtoTestFactory,
} from 'src/modules/payments/testing';
import { ListPaymentsUseCase } from './list-payments.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';
import {
  CallerContext,
  createUserCallerContext,
} from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('ListPaymentsUseCase', () => {
  let useCase: ListPaymentsUseCase;
  let mockQueryService: MockPaymentQueryService;

  const adminContext: CallerContext = createUserCallerContext({
    userId: 1,
    role: 'ADMIN',
    permissions: new Set([
      'view_customer_pii',
      'view_all_payments',
      'view_all_orders',
    ]),
  });

  const viewerContext: CallerContext = createUserCallerContext({
    userId: 900,
    role: 'ADMIN_READONLY',
    permissions: new Set(['access_admin', 'view_all_payments']),
  });
  const customerContext: CallerContext = createUserCallerContext({
    userId: 123,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_payments', 'view_own_orders']),
  });

  const sampleItem = PaymentDtoTestFactory.createPaymentListItemDTO({
    id: 1,
    userId: 123,
    orderId: 10,
  });

  beforeEach(() => {
    mockQueryService = new MockPaymentQueryService();
    useCase = new ListPaymentsUseCase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  it('should list payments for admin with requested params', async () => {
    mockQueryService.mockSuccessfulList([sampleItem], 1);

    const result = await useCase.execute({
      query: { page: 1, limit: 10, orderId: 10 },
      callerContext: adminContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.items).toEqual([sampleItem]);
    expect(mockQueryService.list).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      orderId: 10,
      authorizedUserId: undefined,
    });
  });

  it('should scope payments to caller userId for customer role', async () => {
    mockQueryService.mockSuccessfulList([sampleItem], 1);

    const result = await useCase.execute({
      query: { page: 1, limit: 10, userId: 999 },
      callerContext: customerContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(mockQueryService.list).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      userId: 999,
      authorizedUserId: 123,
    });
  });

  it('masks customer contact data without view_customer_pii', async () => {
    mockQueryService.mockSuccessfulList([sampleItem], 1);

    const result = await useCase.execute({
      query: { page: 1, limit: 10 },
      callerContext: viewerContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.items[0]).toEqual({
      ...sampleItem,
      userName: `Customer #${sampleItem.userId}`,
      userEmail: expect.stringMatching(/^.\*\*\*@\*\*\*/),
    });
    expect(result.value.items[0].userEmail).not.toBe(sampleItem.userEmail);
  });

  it('keeps customer contact data with view_customer_pii', async () => {
    mockQueryService.mockSuccessfulList([sampleItem], 1);

    const result = await useCase.execute({
      query: { page: 1, limit: 10 },
      callerContext: createUserCallerContext({
        userId: 1,
        role: 'ADMIN',
        permissions: new Set(['view_all_payments', 'view_customer_pii']),
      }),
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.items[0]).toEqual(sampleItem);
  });

  it('rejects contact filters without view_customer_pii', async () => {
    const result = await useCase.execute({
      query: { page: 1, limit: 10, userEmail: 'jane@example.com' },
      callerContext: viewerContext,
    });

    ResultAssertionHelper.assertResultFailure(result);
    expect(mockQueryService.list).not.toHaveBeenCalled();
  });
});
