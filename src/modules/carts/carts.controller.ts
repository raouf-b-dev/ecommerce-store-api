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
import { CallerCtx } from '../identity/primary-adapters/decorators/caller-context.decorator';
import { CallerContext } from '../../shared-kernel/domain/interfaces/caller-context.interface';
import { AddCartItemDto } from './primary-adapters/dto/add-cart-item.dto';
import { UpdateCartItemDto } from './primary-adapters/dto/update-cart-item.dto';
import { CartResponseDto } from './primary-adapters/dto/cart-response.dto';
import { GetCartUseCase } from './core/application/usecases/get-cart/get-cart.usecase';
import { CreateCartUseCase } from './core/application/usecases/create-cart/create-cart.usecase';
import { AddCartItemUseCase } from './core/application/usecases/add-cart-item/add-cart-item.usecase';
import { UpdateCartItemUseCase } from './core/application/usecases/update-cart-item/update-cart-item.usecase';
import { RemoveCartItemUseCase } from './core/application/usecases/remove-cart-item/remove-cart-item.usecase';
import { ClearCartUseCase } from './core/application/usecases/clear-cart/clear-cart.usecase';

@ApiTags('carts')
@ApiBearerAuth()
@RequirePermissions('manage_own_cart')
@Controller('carts')
export class CartsController {
  constructor(
    private readonly getCartUseCase: GetCartUseCase,
    private readonly createCartUseCase: CreateCartUseCase,
    private readonly addCartItemUseCase: AddCartItemUseCase,
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,
    private readonly removeCartItemUseCase: RemoveCartItemUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new cart for authenticated user',
  })
  @ApiResponse({ status: 201, type: CartResponseDto })
  async createCart(@CallerCtx() callerContext: CallerContext | null) {
    return await this.createCartUseCase.execute(callerContext);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cart by ID' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async getCart(
    @Param('id', ParseIntPipe) id: number,
    @CallerCtx() callerContext: CallerContext | null,
  ) {
    return await this.getCartUseCase.execute({
      cartId: id,
      callerContext,
    });
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddCartItemDto,
    @CallerCtx() callerContext: CallerContext | null,
  ) {
    return await this.addCartItemUseCase.execute({
      cartId: id,
      productId: dto.productId,
      quantity: dto.quantity,
      callerContext,
    });
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
    @CallerCtx() callerContext: CallerContext | null,
  ) {
    return await this.updateCartItemUseCase.execute({
      cartId: id,
      itemId: itemId,
      quantity: dto.quantity,
      callerContext,
    });
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @CallerCtx() callerContext: CallerContext | null,
  ) {
    return await this.removeCartItemUseCase.execute({
      cartId: id,
      itemId: itemId,
      callerContext,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Clear cart (remove all items)' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async clearCart(
    @Param('id', ParseIntPipe) id: number,
    @CallerCtx() callerContext: CallerContext | null,
  ) {
    return await this.clearCartUseCase.execute({
      cartId: id,
      callerContext,
    });
  }
}
