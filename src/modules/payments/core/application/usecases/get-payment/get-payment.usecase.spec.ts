import { GetPaymentUseCase } from './get-payment.usecase';
import { MockPaymentQueryService } from '../../../../testing/mocks/payment-query-service.mock';
import { PaymentDtoTestFactory } from '../../../../testing/factories/payment-dto.factory';
import { ResultAssertionHelper } from '../../../../../../testing';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import {
  CallerContext,
  createUserCallerContext,
} from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';

describe('GetPaymentUseCase', () => {
  let useCase: GetPaymentUseCase;
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
    userId: 2,
  });

  beforeEach(() => {
    mockQueryService = new MockPaymentQueryService();
    useCase = new GetPaymentUseCase(mockQueryService);
  });

  afterEach(() => {
    mockQueryService.reset();
  });

  it('should return a payment if found and caller is admin', async () => {
    mockQueryService.mockSuccessfulGetById(sampleDetail);

    const result = await useCase.execute({
      paymentId: 123,
      callerContext: adminContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.id).toBe(123);
    expect(mockQueryService.getById).toHaveBeenCalledWith(123, undefined);
  });

  it('should return a payment if found and belongs to caller', async () => {
    mockQueryService.mockSuccessfulGetById(sampleDetail);

    const result = await useCase.execute({
      paymentId: 123,
      callerContext: customerContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.id).toBe(123);
    expect(mockQueryService.getById).toHaveBeenCalledWith(123, 2);
  });

  it('should return failure if payment is not found for scope', async () => {
    mockQueryService.mockSuccessfulGetById(null);

    const result = await useCase.execute({
      paymentId: 404,
      callerContext: customerContext,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Payment with id 404 not found',
      UseCaseError,
    );
  });
});
