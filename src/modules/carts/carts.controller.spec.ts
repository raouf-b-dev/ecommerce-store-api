import { Test, TestingModule } from '@nestjs/testing';
import { CartsController } from './carts.controller';
import { Result } from '../../shared-kernel/domain/result';

import { AddCartItemUseCase } from './core/application/usecases/add-cart-item/add-cart-item.usecase';
import { ClearCartUseCase } from './core/application/usecases/clear-cart/clear-cart.usecase';
import { CreateCartUseCase } from './core/application/usecases/create-cart/create-cart.usecase';
import { GetCartUseCase } from './core/application/usecases/get-cart/get-cart.usecase';
import { MergeCartsUseCase } from './core/application/usecases/merge-carts/merge-carts.usecase';
import { RemoveCartItemUseCase } from './core/application/usecases/remove-cart-item/remove-cart-item.usecase';
import { UpdateCartItemUseCase } from './core/application/usecases/update-cart-item/update-cart-item.usecase';

describe('CartsController', () => {
  let controller: CartsController;

  let getCartUseCase: GetCartUseCase;
  let createCartUseCase: CreateCartUseCase;
  let addCartItemUseCase: AddCartItemUseCase;
  let updateCartItemUseCase: UpdateCartItemUseCase;
  let removeCartItemUseCase: RemoveCartItemUseCase;
  let clearCartUseCase: ClearCartUseCase;
  let mergeCartsUseCase: MergeCartsUseCase;

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
        {
          provide: MergeCartsUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
      ],
    }).compile();

    controller = module.get<CartsController>(CartsController);

    getCartUseCase = module.get<GetCartUseCase>(GetCartUseCase);
    createCartUseCase = module.get<CreateCartUseCase>(CreateCartUseCase);
    addCartItemUseCase = module.get<AddCartItemUseCase>(AddCartItemUseCase);
    updateCartItemUseCase = module.get<UpdateCartItemUseCase>(
      UpdateCartItemUseCase,
    );
    removeCartItemUseCase = module.get<RemoveCartItemUseCase>(
      RemoveCartItemUseCase,
    );
    clearCartUseCase = module.get<ClearCartUseCase>(ClearCartUseCase);
    mergeCartsUseCase = module.get<MergeCartsUseCase>(MergeCartsUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
