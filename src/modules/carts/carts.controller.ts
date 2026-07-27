import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { RequirePermissions } from '../authorization/primary-adapter/decorators/require-permissions.decorator';
import { CallerCtx } from '../identity/primary-adapters/decorators/caller-context.decorator';
import { CallerContext } from '../../shared-kernel/domain/interfaces/caller-context.interface';
import { isFailure, Result } from '../../shared-kernel/domain/result';
import { AddCartItemDto } from './primary-adapters/dto/add-cart-item.dto';
import { UpdateCartItemDto } from './primary-adapters/dto/update-cart-item.dto';
import { CartResponseDto } from './primary-adapters/dto/cart-response.dto';
import { GetCartUseCase } from './core/application/usecases/get-cart/get-cart.usecase';
import { CreateCartUseCase } from './core/application/usecases/create-cart/create-cart.usecase';
import { AddCartItemUseCase } from './core/application/usecases/add-cart-item/add-cart-item.usecase';
import { UpdateCartItemUseCase } from './core/application/usecases/update-cart-item/update-cart-item.usecase';
import { RemoveCartItemUseCase } from './core/application/usecases/remove-cart-item/remove-cart-item.usecase';
import { ClearCartUseCase } from './core/application/usecases/clear-cart/clear-cart.usecase';
import { MergeCartsUseCase } from './core/application/usecases/merge-carts/merge-carts.usecase';
import { CartToken } from './primary-adapters/decorators/cart-token.decorator';
import { CART_SESSION_HEADER_NAME } from './primary-adapters/constants/cart-session.constants';
import { CartSessionCookieInterceptor } from './primary-adapters/interceptors/cart-session-cookie.interceptor';
import { OptionalAuth } from '../../guards/decorators/optional-auth.decorator';

@ApiTags('carts')
@Controller('carts')
@OptionalAuth()
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
  @UseInterceptors(CartSessionCookieInterceptor)
  @ApiOperation({
    summary: 'Create a new cart (for guest or authenticated user)',
    description:
      'Guest carts receive a session token via X-Cart-Token header, HttpOnly cookie (web), and response body (mobile).',
  })
  @ApiResponse({ status: 201, type: CartResponseDto })
  async createCart(@CallerCtx() callerContext: CallerContext | null) {
    const result = await this.createCartUseCase.execute({ callerContext });
    if (isFailure(result)) return result;

    const responseBody = {
      ...result.value.cart,
      ...(result.value.token ? { token: result.value.token } : {}),
    };

    return Result.success(responseBody);
  }

  @Get(':id')
  @ApiHeader({
    name: CART_SESSION_HEADER_NAME,
    required: false,
    description:
      'Guest cart session token (mobile/API clients). Web clients may rely on the cart_session_token HttpOnly cookie instead.',
  })
  @ApiOperation({ summary: 'Get cart by ID' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async getCart(
    @Param('id', ParseIntPipe) id: number,
    @CallerCtx() callerContext: CallerContext | null,
    @CartToken() cartToken: string | null,
  ) {
    return await this.getCartUseCase.execute({
      cartId: id,
      callerContext,
      cartToken,
    });
  }

  @Post(':id/items')
  @ApiHeader({
    name: CART_SESSION_HEADER_NAME,
    required: false,
    description: 'Guest cart session token (header or HttpOnly cookie).',
  })
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddCartItemDto,
    @CallerCtx() callerContext: CallerContext | null,
    @CartToken() cartToken: string | null,
  ) {
    return await this.addCartItemUseCase.execute({
      cartId: id,
      input: dto,
      callerContext,
      cartToken,
    });
  }

  @Patch(':id/items/:itemId')
  @ApiHeader({
    name: CART_SESSION_HEADER_NAME,
    required: false,
    description: 'Guest cart session token (header or HttpOnly cookie).',
  })
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
    @CallerCtx() callerContext: CallerContext | null,
    @CartToken() cartToken: string | null,
  ) {
    return await this.updateCartItemUseCase.execute({
      cartId: id,
      itemId: itemId,
      input: dto,
      callerContext,
      cartToken,
    });
  }

  @Delete(':id/items/:itemId')
  @ApiHeader({
    name: CART_SESSION_HEADER_NAME,
    required: false,
    description: 'Guest cart session token (header or HttpOnly cookie).',
  })
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @CallerCtx() callerContext: CallerContext | null,
    @CartToken() cartToken: string | null,
  ) {
    return await this.removeCartItemUseCase.execute({
      cartId: id,
      itemId: itemId,
      callerContext,
      cartToken,
    });
  }

  @Delete(':id')
  @ApiHeader({
    name: CART_SESSION_HEADER_NAME,
    required: false,
    description: 'Guest cart session token (header or HttpOnly cookie).',
  })
  @ApiOperation({ summary: 'Clear cart (remove all items)' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async clearCart(
    @Param('id', ParseIntPipe) id: number,
    @CallerCtx() callerContext: CallerContext | null,
    @CartToken() cartToken: string | null,
  ) {
    return await this.clearCartUseCase.execute({
      cartId: id,
      callerContext,
      cartToken,
    });
  }

  @Post(':guestCartId/merge/:userCartId')
  @ApiBearerAuth()
  @RequirePermissions('manage_carts', 'manage_own_cart')
  @ApiHeader({
    name: CART_SESSION_HEADER_NAME,
    required: false,
    description: 'Guest cart session token (header or HttpOnly cookie).',
  })
  @ApiOperation({ summary: 'Merge guest cart into user cart after login' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  async mergeCarts(
    @Param('guestCartId', ParseIntPipe) guestCartId: number,
    @Param('userCartId', ParseIntPipe) userCartId: number,
    @CallerCtx() callerContext: CallerContext | null,
    @CartToken() cartToken: string | null,
  ) {
    return await this.mergeCartsUseCase.execute({
      guestCartId,
      userCartId,
      callerContext,
      cartToken,
    });
  }
}
