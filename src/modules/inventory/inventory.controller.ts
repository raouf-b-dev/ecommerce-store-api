import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RequirePermissions } from '../authorization/primary-adapter/decorators/require-permissions.decorator';
import { Public } from '../../guards/decorators/public.decorator';
import { AdjustStockDto } from './primary-adapters/dto/adjust-stock.dto';
import { ReserveStockDto } from './primary-adapters/dto/reserve-stock.dto';
import {
  InventoryListItemResponseDto,
  InventoryStockResponseDto,
  PaginatedInventoryResponseDto,
} from './primary-adapters/dto/inventory-response.dto';
import { LowStockQueryDto } from './primary-adapters/dto/low-stock-query.dto';
import { ListInventoryQueryDto } from './primary-adapters/dto/list-inventory-query.dto';
import { GetInventoryUseCase } from './core/application/usecases/get-inventory/get-inventory.usecase';
import { ListInventoryUseCase } from './core/application/usecases/list-inventory/list-inventory.usecase';

import { AdjustStockUseCase } from './core/application/usecases/adjust-stock/adjust-stock.usecase';
import { ReserveStockUseCase } from './core/application/usecases/reserve-stock/reserve-stock.usecase';
import { ReleaseStockUseCase } from './core/application/usecases/release-stock/release-stock.usecase';
import { CheckStockUseCase } from './core/application/usecases/check-stock/check-stock.usecase';
import { ListLowStockUseCase } from './core/application/usecases/list-low-stock/list-low-stock.usecase';
import { BulkCheckStockUseCase } from './core/application/usecases/bulk-check-stock/bulk-check-stock.usecase';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly getInventoryUseCase: GetInventoryUseCase,
    private readonly listInventoryUseCase: ListInventoryUseCase,
    private readonly adjustStockUseCase: AdjustStockUseCase,
    private readonly reserveStockUseCase: ReserveStockUseCase,
    private readonly releaseStockUseCase: ReleaseStockUseCase,
    private readonly checkStockUseCase: CheckStockUseCase,
    private readonly listLowStockUseCase: ListLowStockUseCase,
    private readonly bulkCheckStockUseCase: BulkCheckStockUseCase,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List inventory items' })
  @ApiResponse({ status: 200, type: PaginatedInventoryResponseDto })
  async findAll(@Query() query: ListInventoryQueryDto) {
    return await this.listInventoryUseCase.execute(query);
  }

  @Get('products/:productId')
  @Public()
  @ApiOperation({
    summary: 'Get inventory details for a product',
    description:
      'Returns inventory for the product, or `null` (HTTP 200) when no inventory row exists yet.',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory detail, or null when none exists for the product',
    type: InventoryListItemResponseDto,
  })
  async getInventory(@Param('productId', ParseIntPipe) productId: number) {
    return await this.getInventoryUseCase.execute(productId);
  }

  @Post('products/:productId/adjust')
  @ApiBearerAuth()
  @RequirePermissions('manage_inventory')
  @ApiOperation({ summary: 'Adjust stock quantity (add or subtract)' })
  @ApiResponse({ status: 200, type: InventoryStockResponseDto })
  async adjustStock(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: AdjustStockDto,
  ) {
    return await this.adjustStockUseCase.execute({
      productId,
      ...dto,
    });
  }

  @Post('reserve')
  @ApiBearerAuth()
  @RequirePermissions('manage_inventory')
  @ApiOperation({ summary: 'Reserve stock for an order (temporary hold)' })
  @ApiResponse({ status: 200, description: 'Stock reserved successfully' })
  async reserveStock(@Body() dto: ReserveStockDto) {
    return await this.reserveStockUseCase.execute(dto);
  }

  @Post('release/:reservationId')
  @ApiBearerAuth()
  @RequirePermissions('manage_inventory')
  @ApiOperation({ summary: 'Release reserved stock (if order cancelled)' })
  @ApiResponse({ status: 200, description: 'Stock released successfully' })
  async releaseStock(
    @Param('reservationId', ParseIntPipe) reservationId: number,
  ) {
    return await this.releaseStockUseCase.execute(reservationId);
  }

  @Get('check/:productId')
  @Public()
  @ApiOperation({
    summary: 'Check if product is in stock',
    description:
      'Returns availability. Missing inventory is treated as unavailable (qty 0), not an error.',
  })
  @ApiResponse({ status: 200, description: 'Stock availability status' })
  async checkStock(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('quantity') quantity?: number,
  ) {
    return await this.checkStockUseCase.execute({
      productId: productId,
      quantity: quantity ? Number(quantity) : undefined,
    });
  }

  @Post('check/bulk')
  @Public()
  @ApiOperation({ summary: 'Check stock for multiple products' })
  @ApiResponse({ status: 200, description: 'Bulk stock availability status' })
  async bulkCheckStock(
    @Body() dto: { productId: number; quantity?: number }[],
  ) {
    return await this.bulkCheckStockUseCase.execute(dto);
  }

  @Get('low-stock')
  @ApiBearerAuth()
  @RequirePermissions('view_all_inventory')
  @ApiOperation({ summary: 'List products with low stock' })
  @ApiResponse({ status: 200, type: [InventoryStockResponseDto] })
  async listLowStock(@Query() query: LowStockQueryDto) {
    return await this.listLowStockUseCase.execute(query);
  }
}
