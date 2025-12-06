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
import { GetCartController } from './presentation/controllers/get-cart/get-cart.controller';
import { CreateCartController } from './presentation/controllers/create-cart/create-cart.controller';
import { AddCartItemController } from './presentation/controllers/add-cart-item/add-cart-item.controller';
import { UpdateCartItemController } from './presentation/controllers/update-cart-item/update-cart-item.controller';
import { RemoveCartItemController } from './presentation/controllers/remove-cart-item/remove-cart-item.controller';
import { ClearCartController } from './presentation/controllers/clear-cart/clear-cart.controller';
import { MergeCartsController } from './presentation/controllers/merge-carts/merge-carts.controller';

@ApiTags('carts')
@Controller('carts')
export class CartsController {
  constructor(
    private readonly getCartController: GetCartController,
    private readonly createCartController: CreateCartController,
    private readonly addCartItemController: AddCartItemController,
    private readonly updateCartItemController: UpdateCartItemController,
    private readonly removeCartItemController: RemoveCartItemController,
    private readonly clearCartController: ClearCartController,
    private readonly mergeCartsController: MergeCartsController,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new cart (for guest or authenticated user)',
  })
  @ApiResponse({ status: 201, type: CartResponseDto })
  async createCart(@Body() dto: CreateCartDto) {
    return this.createCartController.handle(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cart by ID' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async getCart(@Param('id') id: string) {
    return this.getCartController.handle(id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async addItem(@Param('id') id: string, @Body() dto: AddCartItemDto) {
    return this.addCartItemController.handle(id, dto);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.updateCartItemController.handle(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.removeCartItemController.handle(id, itemId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Clear cart (remove all items)' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async clearCart(@Param('id') id: string) {
    return this.clearCartController.handle(id);
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
    return this.mergeCartsController.handle(guestCartId, userCartId);
  }
}
