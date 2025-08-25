import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CreateOrderDto } from './presentation/dto/create-order.dto';
import { UpdateOrderDto } from './presentation/dto/update-order.dto';
import { GetOrderController } from './presentation/controllers/GetOrder/get-order.controller';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderResponseDto } from './presentation/dto/order-response.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private getOrderController: GetOrderController) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    // return this.ordersService.create(createOrderDto);
  }

  @Get()
  findAll() {
    // return this.ordersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  async findOne(@Param('id') id: string) {
    return this.getOrderController.handle(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    // return this.ordersService.update(+id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // return this.ordersService.remove(+id);
  }
}
