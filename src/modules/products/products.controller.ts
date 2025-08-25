import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { CreateProductDto } from './presentation/dto/create-product.dto';
import { UpdateProductDto } from './presentation/dto/update-product.dto';
import { ProductResponseDto } from './presentation/dto/product-response.dto';
import { GetProductController } from './presentation/controllers/GetProduct/get-product.controller';
import { CreateProductController } from './presentation/controllers/CreateProduct/create-product.controller';
import { DeleteProductController } from './presentation/controllers/DeleteProduct/delete-product.controller';
import { ListProductsController } from './presentation/controllers/ListProducts/list-products.controller';
import { UpdateProductController } from './presentation/controllers/UpdateProduct/update-product.controller';

@ApiTags('products')
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
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  async createProduct(@Body() dto: CreateProductDto) {
    return this.createProductController.handle(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all products' })
  @ApiResponse({ status: 200, type: [ProductResponseDto] })
  findAll() {
    return this.listProductsController.handle();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  findOne(@Param('id') id: string) {
    return this.getProductController.handle(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product by ID' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.updateProductController.handle(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete product by ID' })
  @ApiResponse({ status: 204, description: 'Product deleted' })
  remove(@Param('id') id: string) {
    return this.deleteProductController.handle(id);
  }
}
