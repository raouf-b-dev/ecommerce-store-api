import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { AddAddressController } from './presentation/controllers/add-address/add-address.controller';
import { CreateCustomerController } from './presentation/controllers/create-customer/create-customer.controller';
import { DeleteAddressController } from './presentation/controllers/delete-address/delete-address.controller';
import { DeleteCustomerController } from './presentation/controllers/delete-customer/delete-customer.controller';
import { GetCustomerOrdersController } from './presentation/controllers/get-customer-orders/get-customer-orders.controller';
import { GetCustomerController } from './presentation/controllers/get-customer/get-customer.controller';
import { ListCustomersController } from './presentation/controllers/list-customers/list-customers.controller';
import { SetDefaultAddressController } from './presentation/controllers/set-default-address/set-default-address.controller';
import { UpdateAddressController } from './presentation/controllers/update-address/update-address.controller';
import { UpdateCustomerController } from './presentation/controllers/update-customer/update-customer.controller';

@Module({
  controllers: [CustomersController],
  providers: [
    // Controllers
    CreateCustomerController,
    GetCustomerController,
    ListCustomersController,
    UpdateCustomerController,
    DeleteCustomerController,
    AddAddressController,
    UpdateAddressController,
    DeleteAddressController,
    SetDefaultAddressController,
    GetCustomerOrdersController,
  ],
})
export class CustomersModule {}
