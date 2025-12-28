import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JWTAuthGuard } from '../auth/guards/auth.guard';
import { CreateProductDto } from './presentation/dto/create-product.dto';
import { UpdateProductDto } from './presentation/dto/update-product.dto';
import { ProductResponseDto } from './presentation/dto/product-response.dto';
import { GetProductController } from './presentation/controllers/get-product/get-product.controller';
import { CreateProductController } from './presentation/controllers/create-product/create-product.controller';
import { DeleteProductController } from './presentation/controllers/delete-product/delete-product.controller';
import { ListProductsController } from './presentation/controllers/list-products/list-products.controller';
import { UpdateProductController } from './presentation/controllers/update-product/update-product.controller';

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
  @ApiBearerAuth()
  @UseGuards(JWTAuthGuard)
  @ApiOperation({
    summary: 'Create a new product',
    description:
      'Creates a new product in the catalog. Requires admin privileges.',
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully.',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid product data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required.',
  })
  async createProduct(@Body() dto: CreateProductDto) {
    return this.createProductController.handle(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all products',
    description: 'Retrieves a list of all products in the catalog.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of products retrieved successfully.',
    type: [ProductResponseDto],
  })
  findAll() {
    return this.listProductsController.handle();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({
    status: 200,
    description: 'Product found.',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  findOne(@Param('id') id: string) {
    return this.getProductController.handle(Number(id));
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JWTAuthGuard)
  @ApiOperation({
    summary: 'Update product by ID',
    description: 'Updates an existing product. Requires admin privileges.',
  })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully.',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required.',
  })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.updateProductController.handle(Number(id), updateProductDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JWTAuthGuard)
  @ApiOperation({
    summary: 'Delete product by ID',
    description:
      'Deletes a product from the catalog. Requires admin privileges.',
  })
  @ApiResponse({ status: 204, description: 'Product deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required.',
  })
  remove(@Param('id') id: string) {
    return this.deleteProductController.handle(Number(id));
  }
}
