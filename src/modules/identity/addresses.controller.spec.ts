import { Test, TestingModule } from '@nestjs/testing';
import { Result } from '../../shared-kernel/domain/result';
import { AddAddressUseCase } from './core/application/usecases/address/add-address/add-address.usecase';
import { UpdateAddressUseCase } from './core/application/usecases/address/update-address/update-address.usecase';
import { DeleteAddressUseCase } from './core/application/usecases/address/delete-address/delete-address.usecase';
import { SetDefaultAddressUseCase } from './core/application/usecases/address/set-default-address/set-default-address.usecase';
import { AddressesController } from './addresses.controller';
import { AuthPayloadFactory } from '../../testing/factories/auth-payload.factory';

describe('AddressesController', () => {
  let controller: AddressesController;
  let addAddressUseCase: jest.Mocked<AddAddressUseCase>;
  let updateAddressUseCase: jest.Mocked<UpdateAddressUseCase>;
  let deleteAddressUseCase: jest.Mocked<DeleteAddressUseCase>;
  let setDefaultAddressUseCase: jest.Mocked<SetDefaultAddressUseCase>;
  const callerContext = AuthPayloadFactory.createCustomerContext();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressesController],
      providers: [
        {
          provide: AddAddressUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: UpdateAddressUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: DeleteAddressUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: SetDefaultAddressUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
      ],
    }).compile();

    controller = module.get<AddressesController>(AddressesController);
    addAddressUseCase = module.get(AddAddressUseCase);
    updateAddressUseCase = module.get(UpdateAddressUseCase);
    deleteAddressUseCase = module.get(DeleteAddressUseCase);
    setDefaultAddressUseCase = module.get(SetDefaultAddressUseCase);
  });

  it('should delegate addAddress to AddAddressUseCase', async () => {
    const dto = {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA',
    };
    await controller.addAddress(1, dto, callerContext);
    expect(addAddressUseCase.execute).toHaveBeenCalledWith({
      userId: 1,
      ...dto,
      callerContext,
    });
  });

  it('should delegate deleteAddress to DeleteAddressUseCase', async () => {
    await controller.deleteAddress(1, 2, callerContext);
    expect(deleteAddressUseCase.execute).toHaveBeenCalledWith({
      userId: 1,
      addressId: 2,
      callerContext,
    });
  });

  it('should delegate setDefaultAddress to SetDefaultAddressUseCase', async () => {
    await controller.setDefaultAddress(1, 2, callerContext);
    expect(setDefaultAddressUseCase.execute).toHaveBeenCalledWith({
      userId: 1,
      addressId: 2,
      callerContext,
    });
  });

  it('should delegate updateAddress to UpdateAddressUseCase', async () => {
    const dto = { street: '456 Oak Ave' };
    await controller.updateAddress(1, 2, dto, callerContext);
    expect(updateAddressUseCase.execute).toHaveBeenCalledWith({
      userId: 1,
      addressId: 2,
      ...dto,
      callerContext,
    });
  });
});
