import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { CustomerEntity } from './infrastructure/orm/customer.schema';
import { AddressEntity } from './infrastructure/orm/address.schema';
import { RedisModule } from '../../core/infrastructure/redis/redis.module';
import { CoreModule } from '../../core/core.module';
import {
  POSTGRES_CUSTOMER_REPOSITORY,
  REDIS_CUSTOMER_REPOSITORY,
} from './customer.tokens';
import { PostgresCustomerRepository } from './infrastructure/repositories/postgres-customer-repository/postgres.customer-repository';
import { RedisCustomerRepository } from './infrastructure/repositories/redis-customer-repository/redis.customer-repository';
import { CacheService } from '../../core/infrastructure/redis/cache/cache.service';
import { CustomerRepository } from './domain/repositories/customer.repository';

// Use Cases
import { CreateCustomerUseCase } from './application/usecases/create-customer/create-customer.usecase';
import { GetCustomerUseCase } from './application/usecases/get-customer/get-customer.usecase';
import { ListCustomersUseCase } from './application/usecases/list-customers/list-customers.usecase';
import { UpdateCustomerUseCase } from './application/usecases/update-customer/update-customer.usecase';
import { DeleteCustomerUseCase } from './application/usecases/delete-customer/delete-customer.usecase';
import { AddAddressUseCase } from './application/usecases/add-address/add-address.usecase';
import { UpdateAddressUseCase } from './application/usecases/update-address/update-address.usecase';
import { DeleteAddressUseCase } from './application/usecases/delete-address/delete-address.usecase';
import { SetDefaultAddressUseCase } from './application/usecases/set-default-address/set-default-address.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerEntity, AddressEntity]),
    RedisModule,
    CoreModule,
  ],
  controllers: [CustomersController],
  providers: [
    // Postgres Repo
    {
      provide: POSTGRES_CUSTOMER_REPOSITORY,
      useClass: PostgresCustomerRepository,
    },
    {
      provide: REDIS_CUSTOMER_REPOSITORY,
      useFactory: (
        cacheService: CacheService,
        postgresRepo: PostgresCustomerRepository,
      ) => {
        return new RedisCustomerRepository(
          cacheService,
          postgresRepo,
          new Logger(RedisCustomerRepository.name),
        );
      },
      inject: [CacheService, POSTGRES_CUSTOMER_REPOSITORY],
    },

    // Default Repository Binding
    {
      provide: CustomerRepository,
      useExisting: REDIS_CUSTOMER_REPOSITORY,
    },

    // Use Cases
    CreateCustomerUseCase,
    GetCustomerUseCase,
    ListCustomersUseCase,
    UpdateCustomerUseCase,
    DeleteCustomerUseCase,
    AddAddressUseCase,
    UpdateAddressUseCase,
    DeleteAddressUseCase,
    SetDefaultAddressUseCase,

    // Individual Controllers (needed as providers for CustomersController)
    CreateCustomerController,
    GetCustomerController,
    ListCustomersController,
    UpdateCustomerController,
    DeleteCustomerController,
    AddAddressController,
    UpdateAddressController,
    DeleteAddressController,
    SetDefaultAddressController,
  ],
})
export class CustomersModule {}
