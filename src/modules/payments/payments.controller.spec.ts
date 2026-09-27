import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { Result } from '../../shared-kernel/domain/result';
import { AuthPayloadFactory } from '../../testing/factories/auth-payload.factory';
import { PaymentDtoTestFactory, PaymentTestFactory } from './testing';
import { CapturePaymentUseCase } from './core/application/usecases/capture-payment/capture-payment.usecase';
import { CreatePaymentUseCase } from './core/application/usecases/create-payment/create-payment.usecase';
import { GetPaymentUseCase } from './core/application/usecases/get-payment/get-payment.usecase';
import { ListPaymentsUseCase } from './core/application/usecases/list-payments/list-payments.usecase';
import { ProcessRefundUseCase } from './core/application/usecases/process-refund/process-refund.usecase';
import { VerifyPaymentUseCase } from './core/application/usecases/verify-payment/verify-payment.usecase';
import { HandleStripeWebhookUseCase } from './core/application/usecases/handle-stripe-webhook/handle-stripe-webhook.usecase';
import { GetPaymentByOrderIdUseCase } from './core/application/usecases/get-payment-by-order-id/get-payment-by-order-id.usecase';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let createPaymentUseCase: jest.Mocked<CreatePaymentUseCase>;
  let getPaymentUseCase: jest.Mocked<GetPaymentUseCase>;
  let listPaymentsUseCase: jest.Mocked<ListPaymentsUseCase>;
  let capturePaymentUseCase: jest.Mocked<CapturePaymentUseCase>;
  let processRefundUseCase: jest.Mocked<ProcessRefundUseCase>;
  let verifyPaymentUseCase: jest.Mocked<VerifyPaymentUseCase>;
  let handleStripeWebhookUseCase: jest.Mocked<HandleStripeWebhookUseCase>;
  let getPaymentByOrderIdUseCase: jest.Mocked<GetPaymentByOrderIdUseCase>;
  const callerContext = AuthPayloadFactory.createCustomerContext();
  const mockPayment = PaymentTestFactory.createMockPayment();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: CreatePaymentUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(mockPayment)),
          },
        },
        {
          provide: GetPaymentUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: ListPaymentsUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: CapturePaymentUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(mockPayment)),
          },
        },
        {
          provide: ProcessRefundUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(mockPayment)),
          },
        },
        {
          provide: VerifyPaymentUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(mockPayment)),
          },
        },
        {
          provide: HandleStripeWebhookUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: GetPaymentByOrderIdUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    createPaymentUseCase = module.get(CreatePaymentUseCase);
    getPaymentUseCase = module.get(GetPaymentUseCase);
    listPaymentsUseCase = module.get(ListPaymentsUseCase);
    capturePaymentUseCase = module.get(CapturePaymentUseCase);
    processRefundUseCase = module.get(ProcessRefundUseCase);
    verifyPaymentUseCase = module.get(VerifyPaymentUseCase);
    handleStripeWebhookUseCase = module.get(HandleStripeWebhookUseCase);
    getPaymentByOrderIdUseCase = module.get(GetPaymentByOrderIdUseCase);
  });

  it('should delegate handleStripeWebhook to HandleStripeWebhookUseCase', async () => {
    const signature = 'stripe-signature';
    const body = { id: 'evt_123' };

    await controller.handleStripeWebhook(signature, body);

    expect(handleStripeWebhookUseCase.execute).toHaveBeenCalledWith({
      signature,
      payload: body,
    });
  });

  it('should delegate createPayment to CreatePaymentUseCase', async () => {
    const dto = PaymentDtoTestFactory.createCreatePaymentDto();

    await controller.createPayment(dto, callerContext);

    expect(createPaymentUseCase.execute).toHaveBeenCalledWith({
      ...dto,
      callerContext,
    });
  });

  it('should delegate getPayment to GetPaymentUseCase', async () => {
    await controller.getPayment(5, callerContext);

    expect(getPaymentUseCase.execute).toHaveBeenCalledWith({
      paymentId: 5,
      callerContext,
    });
  });

  it('should delegate listPayments to ListPaymentsUseCase', async () => {
    const query = PaymentDtoTestFactory.createListPaymentsQueryDto();

    await controller.listPayments(query, callerContext);

    expect(listPaymentsUseCase.execute).toHaveBeenCalledWith({
      query,
      callerContext,
    });
  });

  it('should delegate capturePayment to CapturePaymentUseCase', async () => {
    await controller.capturePayment(7);

    expect(capturePaymentUseCase.execute).toHaveBeenCalledWith(7);
  });

  it('should delegate processRefund to ProcessRefundUseCase', async () => {
    const dto = PaymentDtoTestFactory.createProcessRefundDto();

    await controller.processRefund(7, dto);

    expect(processRefundUseCase.execute).toHaveBeenCalledWith({
      paymentId: 7,
      amount: dto.amount,
      reason: dto.reason,
    });
  });

  it('should delegate verifyPayment to VerifyPaymentUseCase', async () => {
    await controller.verifyPayment(9, callerContext);

    expect(verifyPaymentUseCase.execute).toHaveBeenCalledWith({
      paymentId: 9,
      callerContext,
    });
  });

  it('should delegate getOrderPayments to GetPaymentByOrderIdUseCase', async () => {
    await controller.getOrderPayments(10, callerContext);

    expect(getPaymentByOrderIdUseCase.execute).toHaveBeenCalledWith({
      orderId: 10,
      callerContext,
    });
  });
});
