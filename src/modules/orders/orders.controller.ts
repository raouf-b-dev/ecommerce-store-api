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
import { GetOrderController } from './presentation/controllers/GetOrder/get-order.controller';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderResponseDto } from './presentation/dto/order-response.dto';
import { CreateOrderController } from './presentation/controllers/CreateOrder/create-order.controller';
import { ListOrdersController } from './presentation/controllers/ListOrders/list-orders.controller';
import { ListOrdersQueryDto } from './presentation/dto/list-orders-query.dto';
import { CancelOrderController } from './presentation/controllers/CancelOrder/cancel-order.controller';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private getOrderController: GetOrderController,
    private createOrderController: CreateOrderController,
    private listOrdersController: ListOrdersController,
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

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async cancelOrder(@Param('id') id: string) {
    return this.cancelOrderController.handle(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // return this.ordersService.remove(+id);
  }
}
