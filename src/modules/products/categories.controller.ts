import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../authorization/primary-adapter/decorators/require-permissions.decorator';
import { CategoryResponseDto } from './primary-adapters/dto/category-response.dto';
import { CreateCategoryDto } from './primary-adapters/dto/create-category.dto';
import { ListCategoriesQueryDto } from './primary-adapters/dto/list-categories-query.dto';
import { UpdateCategoryDto } from './primary-adapters/dto/update-category.dto';
import { ListCategoriesUseCase } from './core/application/usecases/categories/list-categories.usecase';
import { GetCategoryUseCase } from './core/application/usecases/categories/get-category.usecase';
import { CreateCategoryUseCase } from './core/application/usecases/categories/create-category.usecase';
import { UpdateCategoryUseCase } from './core/application/usecases/categories/update-category.usecase';
import { DeleteCategoryUseCase } from './core/application/usecases/categories/delete-category.usecase';
import { ActivateCategoryUseCase } from './core/application/usecases/categories/activate-category.usecase';
import { DeactivateCategoryUseCase } from './core/application/usecases/categories/deactivate-category.usecase';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly getCategoryUseCase: GetCategoryUseCase,
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    private readonly activateCategoryUseCase: ActivateCategoryUseCase,
    private readonly deactivateCategoryUseCase: DeactivateCategoryUseCase,
  ) {}

  @Post()
  @ApiBearerAuth()
  @RequirePermissions('manage_products')
  @ApiOperation({
    summary: 'Create a new category',
    description:
      'Creates a catalog category. Name and slug must be unique. Requires admin privileges.',
  })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully.',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid category data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - category name or slug already exists.',
  })
  async create(@Body() dto: CreateCategoryDto) {
    return this.createCategoryUseCase.execute(dto);
  }

  @Get()
  @ApiBearerAuth()
  @RequirePermissions('view_all_products')
  @ApiOperation({
    summary: 'List categories',
    description: 'Returns the catalog category reference list.',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully.',
    type: [CategoryResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required.',
  })
  async findAll(@Query() query: ListCategoriesQueryDto) {
    return this.listCategoriesUseCase.execute(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @RequirePermissions('view_all_products')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({
    status: 200,
    description: 'Category found.',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required.',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.getCategoryUseCase.execute(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @RequirePermissions('manage_products')
  @ApiOperation({
    summary: 'Update category by ID',
    description: 'Updates an existing category. Requires admin privileges.',
  })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully.',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - category name or slug already exists.',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.updateCategoryUseCase.execute({
      id,
      ...updateCategoryDto,
    });
  }

  @Delete(':id')
  @ApiBearerAuth()
  @RequirePermissions('manage_products')
  @ApiOperation({
    summary: 'Delete category by ID',
    description:
      'Deletes a category. Products that referenced it keep a null category. Requires admin privileges.',
  })
  @ApiResponse({ status: 204, description: 'Category deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required.',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.deleteCategoryUseCase.execute(id);
  }

  @Post(':id/activate')
  @ApiBearerAuth()
  @RequirePermissions('manage_products')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Activate a category (Admin)' })
  @ApiResponse({ status: 204, description: 'Category activated successfully.' })
  @ApiResponse({ status: 400, description: 'Category is already active.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required.',
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async activate(@Param('id', ParseIntPipe) id: number) {
    return this.activateCategoryUseCase.execute(id);
  }

  @Post(':id/deactivate')
  @ApiBearerAuth()
  @RequirePermissions('manage_products')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a category (Admin)' })
  @ApiResponse({
    status: 204,
    description: 'Category deactivated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Category is already inactive.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required.',
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.deactivateCategoryUseCase.execute(id);
  }
}
