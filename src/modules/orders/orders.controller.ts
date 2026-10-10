import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  Post,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { RequirePermissions } from '../authorization/primary-adapter/decorators/require-permissions.decorator';
import { CallerCtx } from '../identity/primary-adapters/decorators/caller-context.decorator';
import { CallerContext } from '../../shared-kernel/domain/interfaces/caller-context.interface';
import { Result, isFailure } from '../../shared-kernel/domain/result';
import { CheckoutDto } from './primary-adapters/dto/checkout.dto';
import { CheckoutResponseDto } from './primary-adapters/dto/checkout-response.dto';
import {
  OrderDetailResponseDto,
  OrderMutationResponseDto,
} from './primary-adapters/dto/order-detail-response.dto';
import { PaginatedOrdersResponseDto } from './primary-adapters/dto/order-list-response.dto';
import { ListOrdersQueryDto } from './primary-adapters/dto/list-orders-query.dto';
import { DeliverOrderDto } from './primary-adapters/dto/deliver-order.dto';
import { CreateOrderPaymentDto } from './primary-adapters/dto/create-order-payment.dto';
import { OrderPaymentResponseDto } from './primary-adapters/dto/order-payment-response.dto';
import { OrderPaymentDtoMapper } from './primary-adapters/mappers/order-payment-dto.mapper';
import { Idempotent } from '../../infrastructure/decorators/idempotent.decorator';
import { IDEMPOTENCY_REDIS } from '../../infrastructure/redis/constants/redis.constants';

import { CheckoutUseCase } from './core/application/usecases/checkout/checkout.usecase';
import { CreateOrderPaymentUseCase } from './core/application/usecases/create-order-payment/create-order-payment.usecase';
import { ListOrdersUsecase } from './core/application/usecases/list-orders/list-orders.usecase';
import { GetOrderUseCase } from './core/application/usecases/get-order/get-order.usecase';
import { ConfirmOrderUseCase } from './core/application/usecases/confirm-order/confirm-order.usecase';
import { ProcessOrderUseCase } from './core/application/usecases/process-order/process-order.usecase';
import { ShipOrderUseCase } from './core/application/usecases/ship-order/ship-order.usecase';
import { DeliverOrderUseCase } from './core/application/usecases/deliver-order/deliver-order.usecase';
import { CancelOrderUseCase } from './core/application/usecases/cancel-order/cancel-order.usecase';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly listOrdersUseCase: ListOrdersUsecase,
    private readonly confirmOrderUseCase: ConfirmOrderUseCase,
    private readonly processOrderUseCase: ProcessOrderUseCase,
    private readonly shipOrderUseCase: ShipOrderUseCase,
    private readonly deliverOrderUseCase: DeliverOrderUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
    private readonly checkoutUseCase: CheckoutUseCase,
    private readonly createOrderPaymentUseCase: CreateOrderPaymentUseCase,
  ) {}

  @Post('checkout')
  @RequirePermissions('manage_own_cart')
  @ApiOperation({
    summary: 'Initiate checkout process',
    description:
      'Starts the asynchronous checkout process. Returns an orderId and jobId. ' +
      'Poll GET /v1/orders/{id} until the order reaches a terminal status (or client timeout). ' +
      'The cart is cleared (consumed) only after checkout finalization succeeds - not on the HTTP 201 response. ' +
      'If shippingAddress is omitted, the user default address is used; without a default address the request fails with 400.',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout process initiated successfully.',
    type: CheckoutResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid checkout data, missing Idempotency-Key, empty cart, or omitted shippingAddress with no default address on the user profile.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - User must be logged in.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - a request with this idempotency key is already in progress. ' +
      `Clients must honor the Retry-After response header (${IDEMPOTENCY_REDIS.RETRY_AFTER_SECONDS} seconds) before retrying.`,
    headers: {
      'Retry-After': {
        description: `Seconds to wait before retrying (${IDEMPOTENCY_REDIS.RETRY_AFTER_SECONDS}).`,
        schema: {
          type: 'integer',
          example: IDEMPOTENCY_REDIS.RETRY_AFTER_SECONDS,
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable - idempotency store unavailable.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Client idempotency key. Required.',
    required: true,
  })
  @ApiHeader({
    name: 'Retry-After',
    description: `Present on HTTP 409 when the idempotency key is still in progress. Value is ${IDEMPOTENCY_REDIS.RETRY_AFTER_SECONDS} seconds.`,
    required: false,
  })
  @Idempotent()
  async checkout(
    @Body() dto: CheckoutDto,
    @CallerCtx() callerContext: CallerContext | null,
  ) {
    return await this.checkoutUseCase.execute({
      ...dto,
      callerContext,
    });
  }

  @Get()
  @RequirePermissions('view_all_orders', 'view_own_orders')
  @ApiOperation({
    summary: 'Get orders list with pagination and filtering',
    description: 'Retrieve a paginated list of orders with various filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of orders retrieved successfully.',
    type: PaginatedOrdersResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(
    @Query() query: ListOrdersQueryDto,
    @CallerCtx() callerContext: CallerContext,
  ) {
    return await this.listOrdersUseCase.execute({ query, callerContext });
  }

  @Get(':id')
  @RequirePermissions('view_all_orders', 'view_own_orders')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({
    status: 200,
    description: 'Order found.',
    type: OrderDetailResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CallerCtx() callerContext: CallerContext,
  ) {
    return await this.getOrderUseCase.execute({
      orderId: id,
      callerContext,
    });
  }

  @Post(':id/payments')
  @RequirePermissions('view_all_orders', 'view_own_orders')
  @ApiOperation({
    summary: 'Create a payment for an order',
    description:
      'Charges the order total for an order the caller can see. ' +
      'The amount, currency, and owner come from the order. ' +
      'A caller who cannot see the order receives the same not-found result as a missing order.',
  })
  @ApiResponse({ status: 201, type: OrderPaymentResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Missing Idempotency-Key.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - a request with this idempotency key is already in progress. ' +
      `Clients must honor the Retry-After response header (${IDEMPOTENCY_REDIS.RETRY_AFTER_SECONDS} seconds) before retrying.`,
    headers: {
      'Retry-After': {
        description: `Seconds to wait before retrying (${IDEMPOTENCY_REDIS.RETRY_AFTER_SECONDS}).`,
        schema: {
          type: 'integer',
          example: IDEMPOTENCY_REDIS.RETRY_AFTER_SECONDS,
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable - idempotency store unavailable.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Client idempotency key. Required.',
    required: true,
  })
  @ApiHeader({
    name: 'Retry-After',
    description: `Present on HTTP 409 when the idempotency key is still in progress. Value is ${IDEMPOTENCY_REDIS.RETRY_AFTER_SECONDS} seconds.`,
    required: false,
  })
  @Idempotent()
  async createPayment(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: CreateOrderPaymentDto,
    @CallerCtx() callerContext: CallerContext,
  ) {
    const result = await this.createOrderPaymentUseCase.execute({
      orderId,
      paymentMethod: dto.paymentMethod,
      paymentMethodDetails: dto.paymentMethodDetails,
      callerContext,
    });
    if (isFailure(result)) return result;
    return Result.success(OrderPaymentDtoMapper.toResponse(result.value));
  }

  @Patch(':id/confirm')
  @RequirePermissions('manage_orders')
  @ApiOperation({
    summary: 'Confirm a pending order',
    description:
      'Confirms a pending order after payment authorization (mock gateway or Stripe payment intent checkout flow).',
  })
  @ApiResponse({
    status: 200,
    description: 'Order confirmed successfully.',
    type: OrderMutationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({ status: 400, description: 'Order cannot be confirmed.' })
  async confirmOrder(@Param('id', ParseIntPipe) id: number) {
    return await this.confirmOrderUseCase.execute(id);
  }

  @Patch(':id/process')
  @RequirePermissions('manage_orders')
  @ApiOperation({
    summary: 'Process a pending order',
    description: 'Moves a confirmed order to the processing state.',
  })
  @ApiResponse({
    status: 200,
    description: 'Order processing started.',
    type: OrderMutationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async processOrder(@Param('id', ParseIntPipe) id: number) {
    return await this.processOrderUseCase.execute(id);
  }

  @Patch(':id/ship')
  @RequirePermissions('manage_orders')
  @ApiOperation({ summary: 'Mark order as shipped' })
  @ApiResponse({
    status: 200,
    description: 'Order marked as shipped.',
    type: OrderMutationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async shipOrder(@Param('id', ParseIntPipe) id: number) {
    return await this.shipOrderUseCase.execute(id);
  }

  @Patch(':id/deliver')
  @RequirePermissions('manage_orders')
  @ApiOperation({
    summary: 'Mark order as delivered',
    description: 'Mark order as delivered.',
  })
  @ApiResponse({
    status: 200,
    description: 'Order marked as delivered.',
    type: OrderMutationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async deliverOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() deliverOrderDto?: DeliverOrderDto,
  ) {
    return await this.deliverOrderUseCase.execute({
      id: id,
      command: deliverOrderDto,
    });
  }

  @Patch(':id/cancel')
  @RequirePermissions('manage_orders')
  @ApiOperation({
    summary: 'Cancel an order',
    description: 'Cancels an order and triggers compensation logic if needed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully.',
    type: OrderMutationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({
    status: 409,
    description: 'Order cannot be cancelled in current state.',
  })
  async cancelOrder(@Param('id', ParseIntPipe) id: number) {
    return await this.cancelOrderUseCase.execute({ orderId: id });
  }
}
