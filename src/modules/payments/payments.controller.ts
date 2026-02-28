import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { JWTAuthGuard } from '../auth/guards/auth.guard';
import { CreatePaymentDto } from './primary-adapters/dto/create-payment.dto';
import { ProcessRefundDto } from './primary-adapters/dto/process-refund.dto';
import { PaymentResponseDto } from './primary-adapters/dto/payment-response.dto';
import { ListPaymentsQueryDto } from './primary-adapters/dto/list-payments-query.dto';
import { RecordCodPaymentDto } from './primary-adapters/dto/record-cod-payment.dto';

import { CreatePaymentUseCase } from './core/application/usecases/create-payment/create-payment.usecase';
import { GetPaymentUseCase } from './core/application/usecases/get-payment/get-payment.usecase';
import { ListPaymentsUseCase } from './core/application/usecases/list-payments/list-payments.usecase';
import { CapturePaymentUseCase } from './core/application/usecases/capture-payment/capture-payment.usecase';
import { ProcessRefundUseCase } from './core/application/usecases/process-refund/process-refund.usecase';
import { VerifyPaymentUseCase } from './core/application/usecases/verify-payment/verify-payment.usecase';
import { RecordCodPaymentUseCase } from './core/application/usecases/record-cod-payment/record-cod-payment.usecase';
import { HandleStripeWebhookUseCase } from './core/application/usecases/handle-stripe-webhook/handle-stripe-webhook.usecase';
import { HandlePayPalWebhookUseCase } from './core/application/usecases/handle-paypal-webhook/handle-paypal-webhook.usecase';
import { isFailure } from '../../shared-kernel/domain/result';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly getPaymentUseCase: GetPaymentUseCase,
    private readonly listPaymentsUseCase: ListPaymentsUseCase,
    private readonly capturePaymentUseCase: CapturePaymentUseCase,
    private readonly processRefundUseCase: ProcessRefundUseCase,
    private readonly verifyPaymentUseCase: VerifyPaymentUseCase,
    private readonly recordCodPaymentUseCase: RecordCodPaymentUseCase,
    private readonly handleStripeWebhookUseCase: HandleStripeWebhookUseCase,
    private readonly handlePayPalWebhookUseCase: HandlePayPalWebhookUseCase,
  ) {}

  @Post('webhooks/stripe')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Body() body: any,
  ) {
    return await this.handleStripeWebhookUseCase.execute({
      signature,
      payload: body,
    });
  }

  @Post('webhooks/paypal')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handlePayPalWebhook(@Headers() headers: any, @Body() body: any) {
    return await this.handlePayPalWebhookUseCase.execute({
      headers,
      payload: body,
    });
  }

  @Post()
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment intent/transaction' })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  async createPayment(@Body() dto: CreatePaymentDto) {
    return await this.createPaymentUseCase.execute(dto);
  }

  @Get(':id')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async getPayment(@Param('id') id: string) {
    return await this.getPaymentUseCase.execute(Number(id));
  }

  @Get()
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payments with filtering' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async listPayments(@Query() query: ListPaymentsQueryDto) {
    return await this.listPaymentsUseCase.execute(query);
  }

  @Post(':id/capture')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Capture an authorized payment' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async capturePayment(@Param('id') id: string) {
    return await this.capturePaymentUseCase.execute(Number(id));
  }

  @Post(':id/refund')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process a refund for a payment' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async processRefund(@Param('id') id: string, @Body() dto: ProcessRefundDto) {
    return await this.processRefundUseCase.execute({
      id: Number(id),
      dto,
    });
  }

  @Post(':id/verify')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify payment status with payment gateway' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async verifyPayment(@Param('id') id: string) {
    return await this.verifyPaymentUseCase.execute(Number(id));
  }

  @Post('cod/record')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record cash on delivery payment collection' })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  async recordCodPayment(@Body() dto: RecordCodPaymentDto) {
    return await this.recordCodPaymentUseCase.execute(dto);
  }

  @Get('orders/:orderId')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments for an order' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async getOrderPayments(@Param('orderId') orderId: string) {
    return await this.listPaymentsUseCase.execute({
      orderId: Number(orderId),
    });
  }
}
