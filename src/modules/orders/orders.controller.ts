import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CreateOrderDto } from './presentation/dto/create-order.dto';
import { GetOrderController } from './presentation/controllers/get-order/get-order.controller';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderResponseDto } from './presentation/dto/order-response.dto';
import { CreateOrderController } from './presentation/controllers/create-order/create-order.controller';
import { ListOrdersController } from './presentation/controllers/list-orders/list-orders.controller';
import { ListOrdersQueryDto } from './presentation/dto/list-orders-query.dto';
import { CancelOrderController } from './presentation/controllers/cancel-order/cancel-order.controller';
import { ConfirmOrderController as ShipOrderController } from './presentation/controllers/confirm-order/confirm-order.controller';
import { DeliverOrderDto } from './presentation/dto/deliver-order.dto';
import { DeliverOrderController } from './presentation/controllers/deliver-order/deliver-order.controller';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private getOrderController: GetOrderController,
    private createOrderController: CreateOrderController,
    private listOrdersController: ListOrdersController,
    private confirmOrderController: ShipOrderController,
    private shipOrderController: ShipOrderController,
    private deliverOrderController: DeliverOrderController,
    private cancelOrderController: CancelOrderController,
  ) {}

  @Post()
  createOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.createOrderController.handle(createOrderDto);
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
    return this.getOrderController.handle(id);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm a pending order' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async confirmOrder(@Param('id') id: string) {
    return this.confirmOrderController.handle(id);
  }

  @Patch(':id/ship')
  @ApiOperation({ summary: 'Mark order as shipped' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async shipOrder(@Param('id') id: string) {
    return this.shipOrderController.handle(id);
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
    return this.deliverOrderController.handle(id, deliverOrderDto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async cancelOrder(@Param('id') id: string) {
    return this.cancelOrderController.handle(id);
  }

  @Delete(':id')
  remove(@Param('id') _id: string) {
    // return this.ordersService.remove(+id);
  }
}
