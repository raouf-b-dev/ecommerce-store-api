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
