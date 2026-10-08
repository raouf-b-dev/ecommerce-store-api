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
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { nullableResponseSchema } from '../../infrastructure/swagger/nullable-response.schema';
import { RequirePermissions } from '../authorization/primary-adapter/decorators/require-permissions.decorator';
import { CallerCtx } from '../identity/primary-adapters/decorators/caller-context.decorator';
import { CallerContext } from '../../shared-kernel/domain/interfaces/caller-context.interface';
import { Public } from '../../guards/decorators/public.decorator';
import { SkipSanitization } from '../../interceptors/sanitize.interceptor';
import { ProcessRefundDto } from './primary-adapters/dto/process-refund.dto';
import { PaymentResponseDto } from './primary-adapters/dto/payment-response.dto';
import { PaymentDetailResponseDto } from './primary-adapters/dto/payment-detail-response.dto';
import { PaginatedPaymentListResponseDto } from './primary-adapters/dto/payment-list-response.dto';
import { PaymentDtoMapper } from './primary-adapters/mappers/payment-dto.mapper';
import { Result } from '../../shared-kernel/domain/result';
import { ListPaymentsQueryDto } from './primary-adapters/dto/list-payments-query.dto';
import { GetPaymentUseCase } from './core/application/usecases/get-payment/get-payment.usecase';
import { ListPaymentsUseCase } from './core/application/usecases/list-payments/list-payments.usecase';
import { CapturePaymentUseCase } from './core/application/usecases/capture-payment/capture-payment.usecase';
import { ProcessRefundUseCase } from './core/application/usecases/process-refund/process-refund.usecase';
import { VerifyPaymentUseCase } from './core/application/usecases/verify-payment/verify-payment.usecase';
import { HandleStripeWebhookUseCase } from './core/application/usecases/handle-stripe-webhook/handle-stripe-webhook.usecase';
import { GetPaymentByOrderIdUseCase } from './core/application/usecases/get-payment-by-order-id/get-payment-by-order-id.usecase';
import { isFailure } from '../../shared-kernel/domain/result';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly getPaymentUseCase: GetPaymentUseCase,
    private readonly listPaymentsUseCase: ListPaymentsUseCase,
    private readonly capturePaymentUseCase: CapturePaymentUseCase,
    private readonly processRefundUseCase: ProcessRefundUseCase,
    private readonly verifyPaymentUseCase: VerifyPaymentUseCase,
    private readonly handleStripeWebhookUseCase: HandleStripeWebhookUseCase,
    private readonly getPaymentByOrderIdUseCase: GetPaymentByOrderIdUseCase,
  ) {}

  @Post('webhooks/stripe')
  @Public()
  @SkipSanitization()
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() req: Pick<RawBodyRequest<Request>, 'rawBody'>,
  ) {
    return await this.handleStripeWebhookUseCase.execute({
      signature,
      rawBody: req.rawBody,
    });
  }

  @Get()
  @RequirePermissions('view_all_payments', 'view_own_payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payments with filtering' })
  @ApiOkResponse({ type: PaginatedPaymentListResponseDto })
  async listPayments(
    @Query() query: ListPaymentsQueryDto,
    @CallerCtx() callerContext: CallerContext,
  ) {
    return await this.listPaymentsUseCase.execute({
      query,
      callerContext,
    });
  }

  @Get('orders/:orderId')
  @RequirePermissions('view_all_payments', 'view_own_payments')
  @ApiBearerAuth()
  @ApiExtraModels(PaymentDetailResponseDto)
  @ApiOperation({
    summary: 'Get payment for an order',
    description:
      'Returns the payment detail when one exists. Returns `null` (HTTP 200) when the order has no payment yet (e.g. pending payment).',
  })
  @ApiOkResponse({
    description:
      'Payment detail, or null when no payment is associated with the order',
    schema: nullableResponseSchema(PaymentDetailResponseDto),
  })
  async getOrderPayments(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CallerCtx() callerContext: CallerContext,
  ) {
    return await this.getPaymentByOrderIdUseCase.execute({
      orderId,
      callerContext,
    });
  }

  @Get(':id')
  @RequirePermissions('view_all_payments', 'view_own_payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiOkResponse({ type: PaymentDetailResponseDto })
  async getPayment(
    @Param('id', ParseIntPipe) id: number,
    @CallerCtx() callerContext: CallerContext,
  ) {
    return await this.getPaymentUseCase.execute({
      paymentId: id,
      callerContext,
    });
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
    const command = PaymentDtoMapper.toRefundCommand(id, dto);
    if (isFailure(command)) return command;

    const result = await this.processRefundUseCase.execute(command.value);
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
}
