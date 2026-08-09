import { ListPaymentsUseCase } from './list-payments.usecase';
import { MockPaymentQueryService } from '../../../../testing/mocks/payment-query-service.mock';
import { PaymentDtoTestFactory } from '../../../../testing/factories/payment-dto.factory';
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
    permissions: new Set(['view_all_payments', 'view_all_orders']),
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
});
