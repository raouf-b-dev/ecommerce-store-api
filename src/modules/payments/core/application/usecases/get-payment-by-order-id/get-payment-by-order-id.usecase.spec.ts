import { GetPaymentByOrderIdUseCase } from './get-payment-by-order-id.usecase';
import { MockPaymentQueryService } from '../../../../testing/mocks/payment-query-service.mock';
import { PaymentDtoTestFactory } from '../../../../testing/factories/payment-dto.factory';
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
    expect(result.value.id).toBe(123);
    expect(mockQueryService.getByOrderId).toHaveBeenCalledWith(10, undefined);
  });

  it('should return payment detail if order belongs to customer caller', async () => {
    mockQueryService.mockSuccessfulGetByOrderId(sampleDetail);

    const result = await useCase.execute({
      orderId: 10,
      callerContext: customerContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.id).toBe(123);
    expect(mockQueryService.getByOrderId).toHaveBeenCalledWith(10, 2);
  });

  it('should return failure error if payment for order is not found', async () => {
    mockQueryService.mockSuccessfulGetByOrderId(null);

    const result = await useCase.execute({
      orderId: 999,
      callerContext: customerContext,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment for order ID 999 not found',
      UseCaseError,
    );
  });
});
