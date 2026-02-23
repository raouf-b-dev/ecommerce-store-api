import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Body,
  Post,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JWTAuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckoutDto } from './primary-adapters/dto/checkout.dto';
import { CheckoutResponseDto } from './primary-adapters/dto/checkout-response.dto';
import { OrderResponseDto } from './primary-adapters/dto/order-response.dto';
import { ListOrdersQueryDto } from './primary-adapters/dto/list-orders-query.dto';
import { DeliverOrderDto } from './primary-adapters/dto/deliver-order.dto';
import { Idempotent } from '../../shared-kernel/infrastructure/decorators/idempotent.decorator';

import { CheckoutUseCase } from './core/application/usecases/checkout/checkout.usecase';
import { ListOrdersUsecase } from './core/application/usecases/list-orders/list-orders.usecase';
import { GetOrderUseCase } from './core/application/usecases/get-order/get-order.usecase';
import { ConfirmOrderUseCase } from './core/application/usecases/confirm-order/confirm-order.usecase';
import { ProcessOrderUseCase } from './core/application/usecases/process-order/process-order.usecase';
import { ShipOrderUseCase } from './core/application/usecases/ship-order/ship-order.usecase';
import { DeliverOrderUseCase } from './core/application/usecases/deliver-order/deliver-order.usecase';
import { CancelOrderUseCase } from './core/application/usecases/cancel-order/cancel-order.usecase';
import { isFailure } from '../../shared-kernel/domain/result';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard)
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
  ) {}

  @Post('checkout')
  @ApiOperation({
    summary: 'Initiate checkout process',
    description:
      'Starts the asynchronous checkout process. Returns a jobId to track progress via the checkout queue.',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout process initiated successfully.',
    type: CheckoutResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid checkout data or cart is empty.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - User must be logged in.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - A request with this idempotency key is already in progress.',
  })
  @Idempotent()
  async checkout(
    @Body() dto: CheckoutDto,
    @CurrentUser('userId') userId: string,
  ) {
    return await this.checkoutUseCase.execute({
      dto,
      userId: Number(userId),
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get orders list with pagination and filtering',
    description: 'Retrieve a paginated list of orders with various filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of orders retrieved successfully.',
    type: [OrderResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(@Query() query: ListOrdersQueryDto) {
    return await this.listOrdersUseCase.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({
    status: 200,
    description: 'Order found.',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findOne(@Param('id') id: string) {
    return await this.getOrderUseCase.execute(Number(id));
  }

  @Patch(':id/confirm')
  @ApiOperation({
    summary: 'Confirm a pending order',
    description:
      'Confirms a pending order. COD orders require manual phone call confirmation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Order confirmed successfully.',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({ status: 400, description: 'Order cannot be confirmed.' })
  async confirmOrder(
    @Param('id') id: string,
    @Body() body?: { reservationId?: number; cartId?: number },
  ) {
    return await this.confirmOrderUseCase.execute({
      orderId: Number(id),
      reservationId: body?.reservationId,
      cartId: body?.cartId,
    });
  }

  @Patch(':id/process')
  @ApiOperation({
    summary: 'Process a pending order',
    description: 'Moves a confirmed order to the processing state.',
  })
  @ApiResponse({
    status: 200,
    description: 'Order processing started.',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async processOrder(@Param('id') id: string) {
    return await this.processOrderUseCase.execute(Number(id));
  }

  @Patch(':id/ship')
  @ApiOperation({ summary: 'Mark order as shipped' })
  @ApiResponse({
    status: 200,
    description: 'Order marked as shipped.',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async shipOrder(@Param('id') id: string) {
    return await this.shipOrderUseCase.execute(Number(id));
  }

  @Patch(':id/deliver')
  @ApiOperation({
    summary: 'Mark order as delivered',
    description:
      'Mark order as delivered and collects COD payment if applicable.',
  })
  @ApiResponse({
    status: 200,
    description: 'Order marked as delivered.',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async deliverOrder(
    @Param('id') id: string,
    @Body() deliverOrderDto: DeliverOrderDto,
  ) {
    return await this.deliverOrderUseCase.execute({
      id: Number(id),
      deliverOrderDto,
    });
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel an order',
    description: 'Cancels an order and triggers compensation logic if needed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully.',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled.' })
  async cancelOrder(@Param('id') id: string) {
    return await this.cancelOrderUseCase.execute(Number(id));
  }
}
