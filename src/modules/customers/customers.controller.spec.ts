import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { AddAddressController } from './presentation/controllers/add-address/add-address.controller';
import { CreateCustomerController } from './presentation/controllers/create-customer/create-customer.controller';
import { DeleteAddressController } from './presentation/controllers/delete-address/delete-address.controller';
import { DeleteCustomerController } from './presentation/controllers/delete-customer/delete-customer.controller';
import { GetCustomerController } from './presentation/controllers/get-customer/get-customer.controller';
import { ListCustomersController } from './presentation/controllers/list-customers/list-customers.controller';
import { SetDefaultAddressController } from './presentation/controllers/set-default-address/set-default-address.controller';
import { UpdateAddressController } from './presentation/controllers/update-address/update-address.controller';
import { UpdateCustomerController } from './presentation/controllers/update-customer/update-customer.controller';

describe('CustomersController', () => {
  let controller: CustomersController;

  let createCustomerController: CreateCustomerController;
  let getCustomerController: GetCustomerController;
  let listCustomersController: ListCustomersController;
  let updateCustomerController: UpdateCustomerController;
  let deleteCustomerController: DeleteCustomerController;
  let addAddressController: AddAddressController;
  let updateAddressController: UpdateAddressController;
  let deleteAddressController: DeleteAddressController;
  let setDefaultAddressController: SetDefaultAddressController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CreateCustomerController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: GetCustomerController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ListCustomersController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: UpdateCustomerController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: DeleteCustomerController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AddAddressController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: UpdateAddressController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: DeleteAddressController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SetDefaultAddressController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);

    createCustomerController = module.get<CreateCustomerController>(
      CreateCustomerController,
    );
    getCustomerController = module.get<GetCustomerController>(
      GetCustomerController,
    );
    listCustomersController = module.get<ListCustomersController>(
      ListCustomersController,
    );
    updateCustomerController = module.get<UpdateCustomerController>(
      UpdateCustomerController,
    );
    deleteCustomerController = module.get<DeleteCustomerController>(
      DeleteCustomerController,
    );
    addAddressController =
      module.get<AddAddressController>(AddAddressController);
    updateAddressController = module.get<UpdateAddressController>(
      UpdateAddressController,
    );
    deleteAddressController = module.get<DeleteAddressController>(
      DeleteAddressController,
    );
    setDefaultAddressController = module.get<SetDefaultAddressController>(
      SetDefaultAddressController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
