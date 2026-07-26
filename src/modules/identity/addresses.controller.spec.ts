import { Test, TestingModule } from '@nestjs/testing';
import { Result } from '../../shared-kernel/domain/result';
import { AddAddressUseCase } from './core/application/usecases/address/add-address/add-address.usecase';
import { UpdateAddressUseCase } from './core/application/usecases/address/update-address/update-address.usecase';
import { DeleteAddressUseCase } from './core/application/usecases/address/delete-address/delete-address.usecase';
import { SetDefaultAddressUseCase } from './core/application/usecases/address/set-default-address/set-default-address.usecase';
import { AddressesController } from './addresses.controller';

describe('AddressesController', () => {
  let controller: AddressesController;

  let addAddressUseCase: AddAddressUseCase;
  let updateAddressUseCase: UpdateAddressUseCase;
  let deleteAddressUseCase: DeleteAddressUseCase;
  let setDefaultAddressUseCase: SetDefaultAddressUseCase;

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

    addAddressUseCase = module.get<AddAddressUseCase>(AddAddressUseCase);
    updateAddressUseCase =
      module.get<UpdateAddressUseCase>(UpdateAddressUseCase);
    deleteAddressUseCase =
      module.get<DeleteAddressUseCase>(DeleteAddressUseCase);
    setDefaultAddressUseCase = module.get<SetDefaultAddressUseCase>(
      SetDefaultAddressUseCase,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
