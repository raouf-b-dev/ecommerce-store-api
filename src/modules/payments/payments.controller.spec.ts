import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { Result } from '../../shared-kernel/domain/result';

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

  let createPaymentUseCase: CreatePaymentUseCase;
  let getPaymentUseCase: GetPaymentUseCase;
  let listPaymentsUseCase: ListPaymentsUseCase;
  let capturePaymentUseCase: CapturePaymentUseCase;
  let processRefundUseCase: ProcessRefundUseCase;
  let verifyPaymentUseCase: VerifyPaymentUseCase;
  let handleStripeWebhookUseCase: HandleStripeWebhookUseCase;
  let getPaymentByOrderIdUseCase: GetPaymentByOrderIdUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: CreatePaymentUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
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
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: ProcessRefundUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: VerifyPaymentUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
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

    createPaymentUseCase =
      module.get<CreatePaymentUseCase>(CreatePaymentUseCase);
    getPaymentUseCase = module.get<GetPaymentUseCase>(GetPaymentUseCase);
    listPaymentsUseCase = module.get<ListPaymentsUseCase>(ListPaymentsUseCase);
    capturePaymentUseCase = module.get<CapturePaymentUseCase>(
      CapturePaymentUseCase,
    );
    processRefundUseCase =
      module.get<ProcessRefundUseCase>(ProcessRefundUseCase);
    verifyPaymentUseCase =
      module.get<VerifyPaymentUseCase>(VerifyPaymentUseCase);
    handleStripeWebhookUseCase = module.get<HandleStripeWebhookUseCase>(
      HandleStripeWebhookUseCase,
    );
    getPaymentByOrderIdUseCase = module.get<GetPaymentByOrderIdUseCase>(
      GetPaymentByOrderIdUseCase,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getPaymentByOrderIdUseCase on getOrderPayments', async () => {
    const callerContext = {
      kind: 'user',
      userId: 1,
      role: 'CUSTOMER',
      permissions: new Set(['view_own_payments']),
    } as any;
    await controller.getOrderPayments(10, callerContext);

    expect(getPaymentByOrderIdUseCase.execute).toHaveBeenCalledWith({
      orderId: 10,
      callerContext,
    });
  });
});
