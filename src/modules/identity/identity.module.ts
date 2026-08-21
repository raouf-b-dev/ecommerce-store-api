import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from 'src/infrastructure/redis/redis.module';
import { AddressEntity } from './secondary-adapters/orm/address.schema';
import { UserEntity } from './secondary-adapters/orm/user.schema';
import { UsersController } from './users.controller';
import { AddressesController } from './addresses.controller';
import { CachePort } from 'src/infrastructure/redis/cache/cache.port';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { createHealthAwareProxy } from 'src/infrastructure/resilience/health-aware-proxy';
import {
  POSTGRES_USER_REPOSITORY,
  CACHED_USER_REPOSITORY,
} from './identity.tokens';
import { UserRepository } from './core/domain/repositories/user.repository';
import { CachedUserRepository } from './secondary-adapters/repositories/cached-user-repository/cached-user.repository';
import { PostgresUserRepository } from './secondary-adapters/repositories/postgres-user-repository/postgres-user.repository';
import { ActivateUserUseCase } from './core/application/usecases/user/activate-user/activate-user.usecase';
import { DeactivateUserUseCase } from './core/application/usecases/user/deactivate-user/deactivate-user.usecase';
import { AddAddressUseCase } from './core/application/usecases/address/add-address/add-address.usecase';
import { DeleteAddressUseCase } from './core/application/usecases/address/delete-address/delete-address.usecase';
import { SetDefaultAddressUseCase } from './core/application/usecases/address/set-default-address/set-default-address.usecase';
import { UpdateAddressUseCase } from './core/application/usecases/address/update-address/update-address.usecase';
import { CreateUserUseCase } from './core/application/usecases/user/create-user/create-user.usecase';
import { CheckEmailExistsUseCase } from './core/application/usecases/user/check-user-by-email/check-user-by-email.usecase';
import { GetUserByEmailUseCase } from './core/application/usecases/user/get-user-by-email/get-user-by-email.usecase';
import { DeleteUserUseCase } from './core/application/usecases/user/delete-user/delete-user.usecase';
import { GetUserUseCase } from './core/application/usecases/user/get-user/get-user.usecase';
import { ListUsersUseCase } from './core/application/usecases/user/list-users/list-users.usecase';
import { UpdateUserUseCase } from './core/application/usecases/user/update-user/update-user.usecase';
import { UserQueryService } from './core/application/ports/user-query.service';
import { PostgresUserQueryAdapter } from './secondary-adapters/query/postgres-user-query.adapter';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, AddressEntity]), RedisModule],
  controllers: [UsersController, AddressesController],
  providers: [
    {
      provide: POSTGRES_USER_REPOSITORY,
      useClass: PostgresUserRepository,
    },
    {
      provide: CACHED_USER_REPOSITORY,
      useFactory: (
        cacheService: CachePort,
        postgresRepo: PostgresUserRepository,
      ) => {
        return new CachedUserRepository(cacheService, postgresRepo);
      },
      inject: [CachePort, POSTGRES_USER_REPOSITORY],
    },
    {
      provide: UserRepository,
      useFactory: (
        cachedRepo: UserRepository,
        postgresRepo: UserRepository,
        redis: RedisService,
      ) =>
        createHealthAwareProxy(cachedRepo, postgresRepo, () => redis.isReady()),
      inject: [CACHED_USER_REPOSITORY, POSTGRES_USER_REPOSITORY, RedisService],
    },

    //usecases
    ActivateUserUseCase,
    DeactivateUserUseCase,
    AddAddressUseCase,
    UpdateAddressUseCase,
    DeleteAddressUseCase,
    SetDefaultAddressUseCase,
    CreateUserUseCase,
    DeleteUserUseCase,
    GetUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    CheckEmailExistsUseCase,
    GetUserByEmailUseCase,

    // CQRS Presentation Query Service
    {
      provide: UserQueryService,
      useClass: PostgresUserQueryAdapter,
    },
  ],
  exports: [
    CreateUserUseCase,
    GetUserUseCase,
    GetUserByEmailUseCase,
    CheckEmailExistsUseCase,
    DeleteUserUseCase,
    UserQueryService,
  ],
})
export class IdentityModule {}
