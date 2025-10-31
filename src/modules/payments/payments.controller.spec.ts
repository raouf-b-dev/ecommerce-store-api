import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { CapturePaymentController } from './presentation/controllers/capture-payment/capture-payment.controller';
import { CreatePaymentController } from './presentation/controllers/create-payment/create-payment.controller';
import { GetPaymentController } from './presentation/controllers/get-payment/get-payment.controller';
import { ListPaymentsController } from './presentation/controllers/list-payments/list-payments.controller';
import { ProcessRefundController } from './presentation/controllers/process-refund/process-refund.controller';
import { RecordCodPaymentController } from './presentation/controllers/record-cod-payment/record-cod-payment.controller';
import { VerifyPaymentController } from './presentation/controllers/verify-payment/verify-payment.controller';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  let createPaymentController: CreatePaymentController;
  let getPaymentController: GetPaymentController;
  let listPaymentsController: ListPaymentsController;
  let capturePaymentController: CapturePaymentController;
  let processRefundController: ProcessRefundController;
  let verifyPaymentController: VerifyPaymentController;
  let recordCodPaymentController: RecordCodPaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: CreatePaymentController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: GetPaymentController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ListPaymentsController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: CapturePaymentController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ProcessRefundController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: VerifyPaymentController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: RecordCodPaymentController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);

    createPaymentController = module.get<CreatePaymentController>(
      CreatePaymentController,
    );
    getPaymentController =
      module.get<GetPaymentController>(GetPaymentController);
    listPaymentsController = module.get<ListPaymentsController>(
      ListPaymentsController,
    );
    capturePaymentController = module.get<CapturePaymentController>(
      CapturePaymentController,
    );
    processRefundController = module.get<ProcessRefundController>(
      ProcessRefundController,
    );
    verifyPaymentController = module.get<VerifyPaymentController>(
      VerifyPaymentController,
    );
    recordCodPaymentController = module.get<RecordCodPaymentController>(
      RecordCodPaymentController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
