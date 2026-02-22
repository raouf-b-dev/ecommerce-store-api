import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { Result } from '../../core/domain/result';

import { CapturePaymentUseCase } from './application/usecases/capture-payment/capture-payment.usecase';
import { CreatePaymentUseCase } from './application/usecases/create-payment/create-payment.usecase';
import { GetPaymentUseCase } from './application/usecases/get-payment/get-payment.usecase';
import { ListPaymentsUseCase } from './application/usecases/list-payments/list-payments.usecase';
import { ProcessRefundUseCase } from './application/usecases/process-refund/process-refund.usecase';
import { RecordCodPaymentUseCase } from './application/usecases/record-cod-payment/record-cod-payment.usecase';
import { VerifyPaymentUseCase } from './application/usecases/verify-payment/verify-payment.usecase';
import { HandleStripeWebhookUseCase } from './application/usecases/handle-stripe-webhook/handle-stripe-webhook.usecase';
import { HandlePayPalWebhookUseCase } from './application/usecases/handle-paypal-webhook/handle-paypal-webhook.usecase';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  let createPaymentUseCase: CreatePaymentUseCase;
  let getPaymentUseCase: GetPaymentUseCase;
  let listPaymentsUseCase: ListPaymentsUseCase;
  let capturePaymentUseCase: CapturePaymentUseCase;
  let processRefundUseCase: ProcessRefundUseCase;
  let verifyPaymentUseCase: VerifyPaymentUseCase;
  let recordCodPaymentUseCase: RecordCodPaymentUseCase;
  let handleStripeWebhookUseCase: HandleStripeWebhookUseCase;
  let handlePayPalWebhookUseCase: HandlePayPalWebhookUseCase;

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
          provide: RecordCodPaymentUseCase,
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
          provide: HandlePayPalWebhookUseCase,
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
    recordCodPaymentUseCase = module.get<RecordCodPaymentUseCase>(
      RecordCodPaymentUseCase,
    );
    handleStripeWebhookUseCase = module.get<HandleStripeWebhookUseCase>(
      HandleStripeWebhookUseCase,
    );
    handlePayPalWebhookUseCase = module.get<HandlePayPalWebhookUseCase>(
      HandlePayPalWebhookUseCase,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
