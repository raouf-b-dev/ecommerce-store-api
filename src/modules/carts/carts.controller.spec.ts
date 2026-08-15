import { Test, TestingModule } from '@nestjs/testing';
import { CartsController } from './carts.controller';
import { Result } from '../../shared-kernel/domain/result';
import { AddCartItemUseCase } from './core/application/usecases/add-cart-item/add-cart-item.usecase';
import { ClearCartUseCase } from './core/application/usecases/clear-cart/clear-cart.usecase';
import { CreateCartUseCase } from './core/application/usecases/create-cart/create-cart.usecase';
import { GetCartUseCase } from './core/application/usecases/get-cart/get-cart.usecase';
import { RemoveCartItemUseCase } from './core/application/usecases/remove-cart-item/remove-cart-item.usecase';
import { UpdateCartItemUseCase } from './core/application/usecases/update-cart-item/update-cart-item.usecase';
import { AuthPayloadFactory } from '../../testing/factories/auth-payload.factory';
import { CartDtoTestFactory } from './testing';

describe('CartsController', () => {
  let controller: CartsController;
  let getCartUseCase: jest.Mocked<GetCartUseCase>;
  let createCartUseCase: jest.Mocked<CreateCartUseCase>;
  let addCartItemUseCase: jest.Mocked<AddCartItemUseCase>;
  let updateCartItemUseCase: jest.Mocked<UpdateCartItemUseCase>;
  let removeCartItemUseCase: jest.Mocked<RemoveCartItemUseCase>;
  let clearCartUseCase: jest.Mocked<ClearCartUseCase>;
  const callerContext = AuthPayloadFactory.createCustomerContext();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartsController],
      providers: [
        {
          provide: GetCartUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: CreateCartUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: AddCartItemUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: UpdateCartItemUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: RemoveCartItemUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: ClearCartUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
      ],
    }).compile();

    controller = module.get<CartsController>(CartsController);
    getCartUseCase = module.get(GetCartUseCase);
    createCartUseCase = module.get(CreateCartUseCase);
    addCartItemUseCase = module.get(AddCartItemUseCase);
    updateCartItemUseCase = module.get(UpdateCartItemUseCase);
    removeCartItemUseCase = module.get(RemoveCartItemUseCase);
    clearCartUseCase = module.get(ClearCartUseCase);
  });

  it('should delegate createCart to CreateCartUseCase', async () => {
    await controller.createCart(callerContext);
    expect(createCartUseCase.execute).toHaveBeenCalledWith(callerContext);
  });

  it('should delegate getCart to GetCartUseCase', async () => {
    await controller.getCart(10, callerContext);
    expect(getCartUseCase.execute).toHaveBeenCalledWith({
      cartId: 10,
      callerContext,
    });
  });

  it('should delegate addItem to AddCartItemUseCase', async () => {
    const dto = CartDtoTestFactory.createAddCartItemDto();
    await controller.addItem(10, dto, callerContext);
    expect(addCartItemUseCase.execute).toHaveBeenCalledWith({
      cartId: 10,
      productId: dto.productId,
      quantity: dto.quantity,
      callerContext,
    });
  });

  it('should delegate updateItem to UpdateCartItemUseCase', async () => {
    const dto = CartDtoTestFactory.createUpdateCartItemDto();
    await controller.updateItem(10, 5, dto, callerContext);
    expect(updateCartItemUseCase.execute).toHaveBeenCalledWith({
      cartId: 10,
      itemId: 5,
      quantity: dto.quantity,
      callerContext,
    });
  });

  it('should delegate removeItem to RemoveCartItemUseCase', async () => {
    await controller.removeItem(10, 5, callerContext);
    expect(removeCartItemUseCase.execute).toHaveBeenCalledWith({
      cartId: 10,
      itemId: 5,
      callerContext,
    });
  });

  it('should delegate clearCart to ClearCartUseCase', async () => {
    await controller.clearCart(10, callerContext);
    expect(clearCartUseCase.execute).toHaveBeenCalledWith({
      cartId: 10,
      callerContext,
    });
  });
});
