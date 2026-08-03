import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RequirePermissions } from '../authorization/primary-adapter/decorators/require-permissions.decorator';
import { CreateProductDto } from './primary-adapters/dto/create-product.dto';
import { UpdateProductDto } from './primary-adapters/dto/update-product.dto';
import { ProductResponseDto } from './primary-adapters/dto/product-response.dto';
import { CreateProductUseCase } from './core/application/usecases/create-product/create-product.usecase';
import { GetProductUseCase } from './core/application/usecases/get-product/get-product.usecase';
import { ListProductsUseCase } from './core/application/usecases/list-products/list-products.usecase';
import { UpdateProductUseCase } from './core/application/usecases/update-product/update-product.usecase';
import { DeleteProductUseCase } from './core/application/usecases/delete-product/delete-product.usecase';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly getProductUseCase: GetProductUseCase,
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
  ) {}

  @Post()
  @ApiBearerAuth()
  @RequirePermissions('manage_products')
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
    return await this.createProductUseCase.execute(dto);
  }

  @Get()
  @ApiBearerAuth()
  @RequirePermissions('view_all_products')
  @ApiOperation({
    summary: 'List all products',
    description: 'Retrieves a list of all products in the catalog.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of products retrieved successfully.',
    type: [ProductResponseDto],
  })
  async findAll() {
    return await this.listProductsUseCase.execute();
  }

  @Get(':id')
  @ApiBearerAuth()
  @RequirePermissions('view_all_products')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({
    status: 200,
    description: 'Product found.',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.getProductUseCase.execute(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @RequirePermissions('manage_products')
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return await this.updateProductUseCase.execute({
      id,
      ...updateProductDto,
    });
  }

  @Delete(':id')
  @ApiBearerAuth()
  @RequirePermissions('manage_products')
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
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.deleteProductUseCase.execute(id);
  }
}
