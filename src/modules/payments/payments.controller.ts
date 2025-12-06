import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JWTAuthGuard } from '../auth/guards/auth.guard';
import { CreatePaymentDto } from './presentation/dto/create-payment.dto';
import { ProcessRefundDto } from './presentation/dto/process-refund.dto';
import { PaymentResponseDto } from './presentation/dto/payment-response.dto';
import { ListPaymentsQueryDto } from './presentation/dto/list-payments-query.dto';
import { RecordCodPaymentDto } from './presentation/dto/record-cod-payment.dto';
import { CreatePaymentController } from './presentation/controllers/create-payment/create-payment.controller';
import { GetPaymentController } from './presentation/controllers/get-payment/get-payment.controller';
import { ListPaymentsController } from './presentation/controllers/list-payments/list-payments.controller';
import { CapturePaymentController } from './presentation/controllers/capture-payment/capture-payment.controller';
import { ProcessRefundController } from './presentation/controllers/process-refund/process-refund.controller';
import { VerifyPaymentController } from './presentation/controllers/verify-payment/verify-payment.controller';
import { RecordCodPaymentController } from './presentation/controllers/record-cod-payment/record-cod-payment.controller';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly createPaymentController: CreatePaymentController,
    private readonly getPaymentController: GetPaymentController,
    private readonly listPaymentsController: ListPaymentsController,
    private readonly capturePaymentController: CapturePaymentController,
    private readonly processRefundController: ProcessRefundController,
    private readonly verifyPaymentController: VerifyPaymentController,
    private readonly recordCodPaymentController: RecordCodPaymentController,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a payment intent/transaction' })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  async createPayment(@Body() dto: CreatePaymentDto) {
    return this.createPaymentController.handle(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async getPayment(@Param('id') id: string) {
    return this.getPaymentController.handle(id);
  }

  @Get()
  @ApiOperation({ summary: 'List payments with filtering' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async listPayments(@Query() query: ListPaymentsQueryDto) {
    return this.listPaymentsController.handle(query);
  }

  @Post(':id/capture')
  @ApiOperation({ summary: 'Capture an authorized payment' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async capturePayment(@Param('id') id: string) {
    return this.capturePaymentController.handle(id);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Process a refund for a payment' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async processRefund(@Param('id') id: string, @Body() dto: ProcessRefundDto) {
    return this.processRefundController.handle(id, dto);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify payment status with payment gateway' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async verifyPayment(@Param('id') id: string) {
    return this.verifyPaymentController.handle(id);
  }

  @Post('cod/record')
  @ApiOperation({ summary: 'Record cash on delivery payment collection' })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  async recordCodPayment(@Body() dto: RecordCodPaymentDto) {
    return this.recordCodPaymentController.handle(dto);
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Get all payments for an order' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async getOrderPayments(@Param('orderId') orderId: string) {
    return this.listPaymentsController.handle({ orderId });
  }
}
