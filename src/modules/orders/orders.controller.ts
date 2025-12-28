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
  @ApiOperation({ summary: 'Initiate checkout process' })
  @ApiResponse({ status: 201, type: CheckoutResponseDto })
  @Idempotent()
  async checkout(
    @Body() dto: CheckoutDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.checkoutController.handle(dto, Number(userId));
  }

  @Get()
  @ApiOperation({ summary: 'Get orders list with pagination and filtering' })
  @ApiResponse({ status: 200, type: [OrderResponseDto] })
  async findAll(@Query() query: ListOrdersQueryDto) {
    return this.listOrdersController.handle(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async findOne(@Param('id') id: string) {
    return this.getOrderController.handle(Number(id));
  }

  @Patch(':id/confirm')
  @ApiOperation({
    summary:
      'Confirm a pending order (COD orders require manual phone call confirmation)',
  })
  @ApiResponse({ status: 200, type: OrderResponseDto })
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
  @ApiOperation({ summary: 'Process a pending order' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async processOrder(@Param('id') id: string) {
    return this.processOrderController.handle(Number(id));
  }

  @Patch(':id/ship')
  @ApiOperation({ summary: 'Mark order as shipped' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async shipOrder(@Param('id') id: string) {
    return this.shipOrderController.handle(Number(id));
  }

  @Patch(':id/deliver')
  @ApiOperation({
    summary: 'Mark order as delivered (collects COD payment if applicable)',
  })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async deliverOrder(
    @Param('id') id: string,
    @Body() deliverOrderDto: DeliverOrderDto,
  ) {
    return this.deliverOrderController.handle(Number(id), deliverOrderDto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async cancelOrder(@Param('id') id: string) {
    return this.cancelOrderController.handle(Number(id));
  }
}
