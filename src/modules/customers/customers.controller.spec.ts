import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { Result } from '../../core/domain/result';

import { CreateCustomerUseCase } from './application/usecases/create-customer/create-customer.usecase';
import { GetCustomerUseCase } from './application/usecases/get-customer/get-customer.usecase';
import { ListCustomersUseCase } from './application/usecases/list-customers/list-customers.usecase';
import { UpdateCustomerUseCase } from './application/usecases/update-customer/update-customer.usecase';
import { DeleteCustomerUseCase } from './application/usecases/delete-customer/delete-customer.usecase';
import { AddAddressUseCase } from './application/usecases/add-address/add-address.usecase';
import { UpdateAddressUseCase } from './application/usecases/update-address/update-address.usecase';
import { DeleteAddressUseCase } from './application/usecases/delete-address/delete-address.usecase';
import { SetDefaultAddressUseCase } from './application/usecases/set-default-address/set-default-address.usecase';

describe('CustomersController', () => {
  let controller: CustomersController;

  let createCustomerUseCase: CreateCustomerUseCase;
  let getCustomerUseCase: GetCustomerUseCase;
  let listCustomersUseCase: ListCustomersUseCase;
  let updateCustomerUseCase: UpdateCustomerUseCase;
  let deleteCustomerUseCase: DeleteCustomerUseCase;
  let addAddressUseCase: AddAddressUseCase;
  let updateAddressUseCase: UpdateAddressUseCase;
  let deleteAddressUseCase: DeleteAddressUseCase;
  let setDefaultAddressUseCase: SetDefaultAddressUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CreateCustomerUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: GetCustomerUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: ListCustomersUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: UpdateCustomerUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: DeleteCustomerUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
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

    controller = module.get<CustomersController>(CustomersController);

    createCustomerUseCase = module.get<CreateCustomerUseCase>(
      CreateCustomerUseCase,
    );
    getCustomerUseCase = module.get<GetCustomerUseCase>(GetCustomerUseCase);
    listCustomersUseCase =
      module.get<ListCustomersUseCase>(ListCustomersUseCase);
    updateCustomerUseCase = module.get<UpdateCustomerUseCase>(
      UpdateCustomerUseCase,
    );
    deleteCustomerUseCase = module.get<DeleteCustomerUseCase>(
      DeleteCustomerUseCase,
    );
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
