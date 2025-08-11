import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CreateProductDto } from './presentation/dto/create-product.dto';
import { UpdateProductDto } from './presentation/dto/update-product.dto';
import { GetProductController } from './presentation/controllers/GetProduct/get-product.controller';

@Controller('products')
export class ProductsController {
  constructor(private readonly getProductController: GetProductController) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    // return this.handle.create(createProductDto);
  }

  @Get()
  findAll() {
    // return this.getProductController.handle();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.getProductController.handle(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    // return this.getProductController.handle(+id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.getProductController.handle(+id);
  }
}
