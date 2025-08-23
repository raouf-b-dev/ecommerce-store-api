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
import { CreateProductController } from './presentation/controllers/CreateProduct/create-product.controller';
import { DeleteProductController } from './presentation/controllers/DeleteProduct/delete-product.controller';
import { ListProductsController } from './presentation/controllers/ListProducts/list-products.controller';
import { UpdateProductController } from './presentation/controllers/UpdateProduct/update-product.controller';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly createProductController: CreateProductController,
    private readonly getProductController: GetProductController,
    private readonly listProductsController: ListProductsController,
    private readonly updateProductController: UpdateProductController,
    private readonly deleteProductController: DeleteProductController,
  ) {}

  @Post()
  async createProduct(@Body() dto: CreateProductDto) {
    return this.createProductController.handle(dto);
  }

  @Get()
  findAll() {
    return this.listProductsController.handle();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.getProductController.handle(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.updateProductController.handle(id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deleteProductController.handle(id);
  }
}
