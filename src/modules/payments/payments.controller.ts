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
import { AuthGuard } from '../../guards/auth.guard';
import { PermissionsGuard } from '../auth/primary-adapters/guards/permissions.guard';
import { RequirePermissions } from '../auth/primary-adapters/decorators/require-permissions.decorator';
import { CreatePaymentDto } from './primary-adapters/dto/create-payment.dto';
import { ProcessRefundDto } from './primary-adapters/dto/process-refund.dto';
import { PaymentResponseDto } from './primary-adapters/dto/payment-response.dto';
import { PaymentDtoMapper } from './primary-adapters/mappers/payment-dto.mapper';
import { Result } from '../../shared-kernel/domain/result';
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
  @UseGuards(AuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment intent/transaction' })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  async createPayment(@Body() dto: CreatePaymentDto) {
    const result = await this.createPaymentUseCase.execute(dto);
    if (isFailure(result)) return result;
    return Result.success(PaymentDtoMapper.toResponse(result.value));
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async getPayment(@Param('id') id: string) {
    const result = await this.getPaymentUseCase.execute(Number(id));
    if (isFailure(result)) return result;
    return Result.success(PaymentDtoMapper.toResponse(result.value));
  }

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('view_all_payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payments with filtering' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async listPayments(@Query() query: ListPaymentsQueryDto) {
    const result = await this.listPaymentsUseCase.execute(query);
    if (isFailure(result)) return result;
    return Result.success(PaymentDtoMapper.toResponseList(result.value));
  }

  @Post(':id/capture')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('manage_payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Capture an authorized payment' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async capturePayment(@Param('id') id: string) {
    const result = await this.capturePaymentUseCase.execute(Number(id));
    if (isFailure(result)) return result;
    return Result.success(PaymentDtoMapper.toResponse(result.value));
  }

  @Post(':id/refund')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('manage_payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process a refund for a payment' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async processRefund(@Param('id') id: string, @Body() dto: ProcessRefundDto) {
    const result = await this.processRefundUseCase.execute({
      id: Number(id),
      dto,
    });
    if (isFailure(result)) return result;
    return Result.success(PaymentDtoMapper.toResponse(result.value));
  }

  @Post(':id/verify')
  @UseGuards(AuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify payment status with payment gateway' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async verifyPayment(@Param('id') id: string) {
    const result = await this.verifyPaymentUseCase.execute(Number(id));
    if (isFailure(result)) return result;
    return Result.success(PaymentDtoMapper.toResponse(result.value));
  }

  @Post('cod/record')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('manage_payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record cash on delivery payment collection' })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  async recordCodPayment(@Body() dto: RecordCodPaymentDto) {
    const result = await this.recordCodPaymentUseCase.execute(dto);
    if (isFailure(result)) return result;
    return Result.success(PaymentDtoMapper.toResponse(result.value));
  }

  @Get('orders/:orderId')
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions('view_all_payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments for an order' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async getOrderPayments(@Param('orderId') orderId: string) {
    const result = await this.listPaymentsUseCase.execute({
      orderId: Number(orderId),
    });
    if (isFailure(result)) return result;
    return Result.success(PaymentDtoMapper.toResponseList(result.value));
  }
}
