import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { RequirePermissions } from '../authorization/primary-adapter/decorators/require-permissions.decorator';
import { CallerCtx } from '../identity/primary-adapters/decorators/caller-context.decorator';
import { CallerContext } from '../../shared-kernel/domain/interfaces/caller-context.interface';
import { Public } from '../../guards/decorators/public.decorator';
import { CreatePaymentDto } from './primary-adapters/dto/create-payment.dto';
import { ProcessRefundDto } from './primary-adapters/dto/process-refund.dto';
import { PaymentResponseDto } from './primary-adapters/dto/payment-response.dto';
import { PaymentDtoMapper } from './primary-adapters/mappers/payment-dto.mapper';
import { Result } from '../../shared-kernel/domain/result';
import { ListPaymentsQueryDto } from './primary-adapters/dto/list-payments-query.dto';

import { CreatePaymentUseCase } from './core/application/usecases/create-payment/create-payment.usecase';
import { GetPaymentUseCase } from './core/application/usecases/get-payment/get-payment.usecase';
import { ListPaymentsUseCase } from './core/application/usecases/list-payments/list-payments.usecase';
import { CapturePaymentUseCase } from './core/application/usecases/capture-payment/capture-payment.usecase';
import { ProcessRefundUseCase } from './core/application/usecases/process-refund/process-refund.usecase';
import { VerifyPaymentUseCase } from './core/application/usecases/verify-payment/verify-payment.usecase';
import { HandleStripeWebhookUseCase } from './core/application/usecases/handle-stripe-webhook/handle-stripe-webhook.usecase';
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
    private readonly handleStripeWebhookUseCase: HandleStripeWebhookUseCase,
  ) {}

  @Post('webhooks/stripe')
  @Public()
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

  @Post()
  @RequirePermissions('view_all_orders', 'view_own_orders')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment intent/transaction' })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @CallerCtx() callerContext: CallerContext,
  ) {
    const result = await this.createPaymentUseCase.execute({
      command: dto,
      callerContext,
    });
    if (isFailure(result)) return result;
    return Result.success(PaymentDtoMapper.toResponse(result.value));
  }

  @Get(':id')
  @RequirePermissions('view_all_payments', 'view_own_payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async getPayment(
    @Param('id', ParseIntPipe) id: number,
    @CallerCtx() callerContext: CallerContext,
  ) {
    const result = await this.getPaymentUseCase.execute({
      paymentId: id,
      callerContext,
    });
    if (isFailure(result)) return result;
    return Result.success(PaymentDtoMapper.toResponse(result.value));
  }

  @Get()
  @RequirePermissions('view_all_payments', 'view_own_payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payments with filtering' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async listPayments(
    @Query() query: ListPaymentsQueryDto,
    @CallerCtx() callerContext: CallerContext,
  ) {
    const result = await this.listPaymentsUseCase.execute({
      query,
      callerContext,
    });
    if (isFailure(result)) return result;
    return Result.success(PaymentDtoMapper.toResponseList(result.value));
  }

  @Post(':id/capture')
  @RequirePermissions('manage_payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Capture an authorized payment' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async capturePayment(@Param('id', ParseIntPipe) id: number) {
    const result = await this.capturePaymentUseCase.execute(id);
    if (isFailure(result)) return result;
    return Result.success(PaymentDtoMapper.toResponse(result.value));
  }

  @Post(':id/refund')
  @RequirePermissions('manage_payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process a refund for a payment' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async processRefund(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcessRefundDto,
  ) {
    const result = await this.processRefundUseCase.execute({
      id: id,
      dto,
    });
    if (isFailure(result)) return result;
    return Result.success(PaymentDtoMapper.toResponse(result.value));
  }

  @Post(':id/verify')
  @RequirePermissions('view_all_payments', 'view_own_payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify payment status with payment gateway' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async verifyPayment(
    @Param('id', ParseIntPipe) id: number,
    @CallerCtx() callerContext: CallerContext,
  ) {
    const result = await this.verifyPaymentUseCase.execute({
      paymentId: id,
      callerContext,
    });
    if (isFailure(result)) return result;
    return Result.success(PaymentDtoMapper.toResponse(result.value));
  }

  @Get('orders/:orderId')
  @RequirePermissions('view_all_payments', 'view_own_payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments for an order' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async getOrderPayments(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CallerCtx() callerContext: CallerContext,
  ) {
    const result = await this.listPaymentsUseCase.execute({
      query: { orderId: orderId },
      callerContext,
    });
    if (isFailure(result)) return result;
    return Result.success(PaymentDtoMapper.toResponseList(result.value));
  }
}
