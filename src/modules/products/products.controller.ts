import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
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
import { ListProductsQueryDto } from './primary-adapters/dto/list-products-query.dto';
import {
  ProductResponseDto,
  ProductDetailResponseDto,
  PaginatedProductsResponseDto,
} from './primary-adapters/dto/product-response.dto';
import { CreateProductUseCase } from './core/application/usecases/create-product/create-product.usecase';
import { GetProductUseCase } from './core/application/usecases/get-product/get-product.usecase';
import { ListProductsUseCase } from './core/application/usecases/list-products/list-products.usecase';
import { UpdateProductUseCase } from './core/application/usecases/update-product/update-product.usecase';
import { DeleteProductUseCase } from './core/application/usecases/delete-product/delete-product.usecase';
import { ActivateProductUseCase } from './core/application/usecases/activate-product/activate-product.usecase';
import { DeactivateProductUseCase } from './core/application/usecases/deactivate-product/deactivate-product.usecase';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly getProductUseCase: GetProductUseCase,
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
    private readonly activateProductUseCase: ActivateProductUseCase,
    private readonly deactivateProductUseCase: DeactivateProductUseCase,
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
    summary: 'List products',
    description:
      'Retrieves a paginated list of products with optional filters and sorting.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of products retrieved successfully.',
    type: PaginatedProductsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required.',
  })
  async findAll(@Query() query: ListProductsQueryDto) {
    return await this.listProductsUseCase.execute(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @RequirePermissions('view_all_products')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({
    status: 200,
    description: 'Product found.',
    type: ProductDetailResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required.',
  })
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
  @ApiResponse({
    status: 409,
    description:
      'Conflict — product was modified concurrently. Reload and retry.',
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

  @Post(':id/activate')
  @ApiBearerAuth()
  @RequirePermissions('manage_products')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Activate a product in the catalog (Admin)' })
  @ApiResponse({ status: 204, description: 'Product activated successfully.' })
  @ApiResponse({ status: 400, description: 'Product is already active.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required.',
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiResponse({
    status: 409,
    description:
      'Conflict — product was modified concurrently. Reload and retry.',
  })
  async activate(@Param('id', ParseIntPipe) id: number) {
    return this.activateProductUseCase.execute(id);
  }

  @Post(':id/deactivate')
  @ApiBearerAuth()
  @RequirePermissions('manage_products')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a product in the catalog (Admin)' })
  @ApiResponse({
    status: 204,
    description: 'Product deactivated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Product is already inactive.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required.',
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  @ApiResponse({
    status: 409,
    description:
      'Conflict — product was modified concurrently. Reload and retry.',
  })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.deactivateProductUseCase.execute(id);
  }
}
