import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { CapturePaymentController } from './presentation/controllers/capture-payment/capture-payment.controller';
import { CreatePaymentController } from './presentation/controllers/create-payment/create-payment.controller';
import { GetPaymentController } from './presentation/controllers/get-payment/get-payment.controller';
import { ListPaymentsController } from './presentation/controllers/list-payments/list-payments.controller';
import { ProcessRefundController } from './presentation/controllers/process-refund/process-refund.controller';
import { RecordCodPaymentController } from './presentation/controllers/record-cod-payment/record-cod-payment.controller';
import { VerifyPaymentController } from './presentation/controllers/verify-payment/verify-payment.controller';

@Module({
  controllers: [PaymentsController],
  providers: [
    // Controllers
    CreatePaymentController,
    GetPaymentController,
    ListPaymentsController,
    CapturePaymentController,
    ProcessRefundController,
    VerifyPaymentController,
    RecordCodPaymentController,
  ],
})
export class PaymentsModule {}
