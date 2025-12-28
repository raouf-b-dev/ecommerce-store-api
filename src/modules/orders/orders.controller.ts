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
import { CheckoutController } from './presentation/controllers/checkout/checkout.controller';
import { CheckoutDto } from './presentation/dto/checkout.dto';
import { CheckoutResponseDto } from './presentation/dto/checkout-response.dto';
import { GetOrderController } from './presentation/controllers/get-order/get-order.controller';
import { OrderResponseDto } from './presentation/dto/order-response.dto';
import { ListOrdersController } from './presentation/controllers/list-orders/list-orders.controller';
import { ListOrdersQueryDto } from './presentation/dto/list-orders-query.dto';
import { CancelOrderController } from './presentation/controllers/cancel-order/cancel-order.controller';
import { ConfirmOrderController } from './presentation/controllers/confirm-order/confirm-order.controller';
import { ShipOrderController } from './presentation/controllers/ship-order/ship-order.controller';
import { DeliverOrderDto } from './presentation/dto/deliver-order.dto';
import { DeliverOrderController } from './presentation/controllers/deliver-order/deliver-order.controller';
import { ProcessOrderController } from './presentation/controllers/process-order/process-order.controller';
import { Idempotent } from '../../core/infrastructure/decorators/idempotent.decorator';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private getOrderController: GetOrderController,
    private listOrdersController: ListOrdersController,
    private confirmOrderController: ConfirmOrderController,
    private processOrderController: ProcessOrderController,
    private shipOrderController: ShipOrderController,
    private deliverOrderController: DeliverOrderController,
    private cancelOrderController: CancelOrderController,
    private checkoutController: CheckoutController,
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
    return this.checkoutController.handle(dto, Number(userId));
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
    return this.listOrdersController.handle(query);
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
    return this.getOrderController.handle(Number(id));
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
    return this.confirmOrderController.handle(
      Number(id),
      body?.reservationId,
      body?.cartId,
    );
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
    return this.processOrderController.handle(Number(id));
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
    return this.shipOrderController.handle(Number(id));
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
    return this.deliverOrderController.handle(Number(id), deliverOrderDto);
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
    return this.cancelOrderController.handle(Number(id));
  }
}
