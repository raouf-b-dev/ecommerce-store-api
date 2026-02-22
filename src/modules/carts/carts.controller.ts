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
import { CreateCartDto } from './presentation/dto/create-cart.dto';
import { AddCartItemDto } from './presentation/dto/add-cart-item.dto';
import { UpdateCartItemDto } from './presentation/dto/update-cart-item.dto';
import { CartResponseDto } from './presentation/dto/cart-response.dto';
import { GetCartUseCase } from './application/usecases/get-cart/get-cart.usecase';
import { CreateCartUseCase } from './application/usecases/create-cart/create-cart.usecase';
import { AddCartItemUseCase } from './application/usecases/add-cart-item/add-cart-item.usecase';
import { UpdateCartItemUseCase } from './application/usecases/update-cart-item/update-cart-item.usecase';
import { RemoveCartItemUseCase } from './application/usecases/remove-cart-item/remove-cart-item.usecase';
import { ClearCartUseCase } from './application/usecases/clear-cart/clear-cart.usecase';
import { MergeCartsUseCase } from './application/usecases/merge-carts/merge-carts.usecase';
import { isFailure } from '../../core/domain/result';

@ApiTags('carts')
@Controller('carts')
export class CartsController {
  constructor(
    private readonly getCartUseCase: GetCartUseCase,
    private readonly createCartUseCase: CreateCartUseCase,
    private readonly addCartItemUseCase: AddCartItemUseCase,
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,
    private readonly removeCartItemUseCase: RemoveCartItemUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
    private readonly mergeCartsUseCase: MergeCartsUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new cart (for guest or authenticated user)',
  })
  @ApiResponse({ status: 201, type: CartResponseDto })
  async createCart(@Body() dto: CreateCartDto) {
    return await this.createCartUseCase.execute(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cart by ID' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async getCart(@Param('id') id: string) {
    return await this.getCartUseCase.execute(Number(id));
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async addItem(@Param('id') id: string, @Body() dto: AddCartItemDto) {
    return await this.addCartItemUseCase.execute({
      cartId: Number(id),
      dto,
    });
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return await this.updateCartItemUseCase.execute({
      cartId: Number(id),
      itemId: Number(itemId),
      dto,
    });
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    await this.removeCartItemUseCase.execute({
      cartId: Number(id),
      itemId: Number(itemId),
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Clear cart (remove all items)' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async clearCart(@Param('id') id: string) {
    return await this.clearCartUseCase.execute(Number(id));
  }

  @Post(':guestCartId/merge/:userCartId')
  @ApiBearerAuth()
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Merge guest cart into user cart after login' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async mergeCarts(
    @Param('guestCartId') guestCartId: string,
    @Param('userCartId') userCartId: string,
  ) {
    return await this.mergeCartsUseCase.execute({
      guestCartId: Number(guestCartId),
      userCartId: Number(userCartId),
    });
  }
}
