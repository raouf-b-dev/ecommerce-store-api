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
import { GetInventoryUseCase } from './application/get-inventory/get-inventory.usecase';
import { AdjustStockUseCase } from './application/adjust-stock/adjust-stock.usecase';
import { ReserveStockUseCase } from './application/reserve-stock/reserve-stock.usecase';
import { ReleaseStockUseCase } from './application/release-stock/release-stock.usecase';
import { CheckStockUseCase } from './application/check-stock/check-stock.usecase';
import { ListLowStockUseCase } from './application/list-low-stock/list-low-stock.usecase';
import { BulkCheckStockUseCase } from './application/bulk-check-stock/bulk-check-stock.usecase';
import { isFailure } from '../../core/domain/result';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly getInventoryUseCase: GetInventoryUseCase,
    private readonly adjustStockUseCase: AdjustStockUseCase,
    private readonly reserveStockUseCase: ReserveStockUseCase,
    private readonly releaseStockUseCase: ReleaseStockUseCase,
    private readonly checkStockUseCase: CheckStockUseCase,
    private readonly listLowStockUseCase: ListLowStockUseCase,
    private readonly bulkCheckStockUseCase: BulkCheckStockUseCase,
  ) {}

  @Get('products/:productId')
  @ApiOperation({ summary: 'Get inventory details for a product' })
  @ApiResponse({ status: 200, type: InventoryResponseDto })
  async getInventory(@Param('productId') productId: string) {
    return await this.getInventoryUseCase.execute(Number(productId));
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
    return await this.adjustStockUseCase.execute({
      productId: Number(productId),
      dto,
    });
  }

  @Post('reserve')
  @ApiBearerAuth()
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Reserve stock for an order (temporary hold)' })
  @ApiResponse({ status: 200, description: 'Stock reserved successfully' })
  async reserveStock(@Body() dto: ReserveStockDto) {
    return await this.reserveStockUseCase.execute(dto);
  }

  @Post('release/:reservationId')
  @ApiBearerAuth()
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Release reserved stock (if order cancelled)' })
  @ApiResponse({ status: 200, description: 'Stock released successfully' })
  async releaseStock(@Param('reservationId') reservationId: string) {
    return await this.releaseStockUseCase.execute(Number(reservationId));
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Check if product is in stock' })
  @ApiResponse({ status: 200, description: 'Stock availability status' })
  async checkStock(
    @Param('productId') productId: string,
    @Query('quantity') quantity?: number,
  ) {
    return await this.checkStockUseCase.execute({
      productId: Number(productId),
      quantity: quantity ? Number(quantity) : undefined,
    });
  }

  @Post('check/bulk')
  @ApiOperation({ summary: 'Check stock for multiple products' })
  @ApiResponse({ status: 200, description: 'Bulk stock availability status' })
  async bulkCheckStock(
    @Body() dto: { productId: number; quantity?: number }[],
  ) {
    return await this.bulkCheckStockUseCase.execute(dto);
  }

  @Get('low-stock')
  @ApiBearerAuth()
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'List products with low stock' })
  @ApiResponse({ status: 200, type: [InventoryResponseDto] })
  async listLowStock(@Query() query: LowStockQueryDto) {
    return await this.listLowStockUseCase.execute(query);
  }
}
