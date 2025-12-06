import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JWTAuthGuard } from '../auth/guards/auth.guard';
import { AdjustStockDto } from './presentation/dto/adjust-stock.dto';
import { ReserveStockDto } from './presentation/dto/reserve-stock.dto';
import { InventoryResponseDto } from './presentation/dto/inventory-response.dto';
import { LowStockQueryDto } from './presentation/dto/low-stock-query.dto';
import { GetInventoryController } from './presentation/controllers/get-inventory/get-inventory.controller';
import { AdjustStockController } from './presentation/controllers/adjust-stock/adjust-stock.controller';
import { ReserveStockController } from './presentation/controllers/reserve-stock/reserve-stock.controller';
import { ReleaseStockController } from './presentation/controllers/release-stock/release-stock.controller';
import { CheckStockController } from './presentation/controllers/check-stock/check-stock.controller';
import { ListLowStockController } from './presentation/controllers/list-low-stock/list-low-stock.controller';
import { BulkCheckStockController } from './presentation/controllers/bulk-check-stock/bulk-check-stock.controller';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly getInventoryController: GetInventoryController,
    private readonly adjustStockController: AdjustStockController,
    private readonly reserveStockController: ReserveStockController,
    private readonly releaseStockController: ReleaseStockController,
    private readonly checkStockController: CheckStockController,
    private readonly listLowStockController: ListLowStockController,
    private readonly bulkCheckStockController: BulkCheckStockController,
  ) {}

  @Get('products/:productId')
  @ApiOperation({ summary: 'Get inventory details for a product' })
  @ApiResponse({ status: 200, type: InventoryResponseDto })
  async getInventory(@Param('productId') productId: string) {
    return this.getInventoryController.handle(productId);
  }

  @Post('products/:productId/adjust')
  @ApiBearerAuth()
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Adjust stock quantity (add or subtract)' })
  @ApiResponse({ status: 200, type: InventoryResponseDto })
  async adjustStock(
    @Param('productId') productId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.adjustStockController.handle(productId, dto);
  }

  @Post('reserve')
  @ApiBearerAuth()
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Reserve stock for an order (temporary hold)' })
  @ApiResponse({ status: 200, description: 'Stock reserved successfully' })
  async reserveStock(@Body() dto: ReserveStockDto) {
    return this.reserveStockController.handle(dto);
  }

  @Post('release/:reservationId')
  @ApiBearerAuth()
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Release reserved stock (if order cancelled)' })
  @ApiResponse({ status: 200, description: 'Stock released successfully' })
  async releaseStock(@Param('reservationId') reservationId: string) {
    return this.releaseStockController.handle(reservationId);
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Check if product is in stock' })
  @ApiResponse({ status: 200, description: 'Stock availability status' })
  async checkStock(
    @Param('productId') productId: string,
    @Query('quantity') quantity?: number,
  ) {
    return this.checkStockController.handle(productId, quantity);
  }

  @Post('check/bulk')
  @ApiOperation({ summary: 'Check stock for multiple products' })
  @ApiResponse({ status: 200, description: 'Bulk stock availability status' })
  async bulkCheckStock(
    @Body() dto: { productId: string; quantity?: number }[],
  ) {
    return this.bulkCheckStockController.handle(dto);
  }

  @Get('low-stock')
  @ApiBearerAuth()
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'List products with low stock' })
  @ApiResponse({ status: 200, type: [InventoryResponseDto] })
  async listLowStock(@Query() query: LowStockQueryDto) {
    return this.listLowStockController.handle(query);
  }
}
