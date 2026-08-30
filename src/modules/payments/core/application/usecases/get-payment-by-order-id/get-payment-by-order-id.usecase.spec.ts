import {
  MockPaymentQueryService,
  PaymentDtoTestFactory,
} from 'src/modules/payments/testing';
import { GetPaymentByOrderIdUseCase } from './get-payment-by-order-id.usecase';
import { ResultAssertionHelper } from '../../../../../../testing';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import {
  CallerContext,
  createUserCallerContext,
} from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('GetPaymentByOrderIdUseCase', () => {
  let useCase: GetPaymentByOrderIdUseCase;
  let mockQueryService: MockPaymentQueryService;

  const adminContext: CallerContext = createUserCallerContext({
    userId: 1,
    role: 'ADMIN',
    permissions: new Set(['view_all_payments']),
  });

  const customerContext: CallerContext = createUserCallerContext({
    userId: 2,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_payments']),
  });

  const sampleDetail = PaymentDtoTestFactory.createPaymentDetailDTO({
    id: 123,
    orderId: 10,
    userId: 2,
  });

  beforeEach(() => {
    mockQueryService = new MockPaymentQueryService();
    useCase = new GetPaymentByOrderIdUseCase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  it('should return payment detail for order if caller is admin', async () => {
    mockQueryService.mockSuccessfulGetByOrderId(sampleDetail);

    const result = await useCase.execute({
      orderId: 10,
      callerContext: adminContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).not.toBeNull();
    expect(result.value!.id).toBe(123);
    expect(mockQueryService.getByOrderId).toHaveBeenCalledWith(10, undefined);
  });

  it('should return payment detail if order belongs to customer caller', async () => {
    mockQueryService.mockSuccessfulGetByOrderId(sampleDetail);

    const result = await useCase.execute({
      orderId: 10,
      callerContext: customerContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).not.toBeNull();
    expect(result.value!.id).toBe(123);
    expect(mockQueryService.getByOrderId).toHaveBeenCalledWith(10, 2);
  });

  it('should return null when no payment exists for the order', async () => {
    mockQueryService.mockSuccessfulGetByOrderId(null);

    const result = await useCase.execute({
      orderId: 999,
      callerContext: customerContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toBeNull();
  });

  it('should return failure when caller is not allowed to view payments', async () => {
    const stranger: CallerContext = createUserCallerContext({
      userId: 99,
      role: 'CUSTOMER',
      permissions: new Set(),
    });

    const result = await useCase.execute({
      orderId: 10,
      callerContext: stranger,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment for order ID 10 not found',
      UseCaseError,
    );
    expect(mockQueryService.getByOrderId).not.toHaveBeenCalled();
  });
});
