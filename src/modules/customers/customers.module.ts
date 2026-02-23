import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersController } from './customers.controller';
import { CustomerEntity } from './secondary-adapters/orm/customer.schema';
import { AddressEntity } from './secondary-adapters/orm/address.schema';
import { RedisModule } from '../../shared-kernel/infrastructure/redis/redis.module';
import {
  POSTGRES_CUSTOMER_REPOSITORY,
  REDIS_CUSTOMER_REPOSITORY,
} from './customer.tokens';
import { PostgresCustomerRepository } from './secondary-adapters/repositories/postgres-customer-repository/postgres.customer-repository';
import { RedisCustomerRepository } from './secondary-adapters/repositories/redis-customer-repository/redis.customer-repository';
import { CacheService } from '../../shared-kernel/infrastructure/redis/cache/cache.service';
import { CustomerRepository } from './core/domain/repositories/customer.repository';

// Use Cases
import { CreateCustomerUseCase } from './core/application/usecases/create-customer/create-customer.usecase';
import { GetCustomerUseCase } from './core/application/usecases/get-customer/get-customer.usecase';
import { ListCustomersUseCase } from './core/application/usecases/list-customers/list-customers.usecase';
import { UpdateCustomerUseCase } from './core/application/usecases/update-customer/update-customer.usecase';
import { DeleteCustomerUseCase } from './core/application/usecases/delete-customer/delete-customer.usecase';
import { AddAddressUseCase } from './core/application/usecases/add-address/add-address.usecase';
import { UpdateAddressUseCase } from './core/application/usecases/update-address/update-address.usecase';
import { DeleteAddressUseCase } from './core/application/usecases/delete-address/delete-address.usecase';
import { SetDefaultAddressUseCase } from './core/application/usecases/set-default-address/set-default-address.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerEntity, AddressEntity]),
    RedisModule,
  ],
  exports: [CreateCustomerUseCase, GetCustomerUseCase],
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
  ],
})
export class CustomersModule {}
