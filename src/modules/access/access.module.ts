import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from 'src/infrastructure/redis/redis.module';
import { AddressEntity } from './secondary-adapters/orm/address.schema';
import { PermissionEntity } from './secondary-adapters/orm/permission.schema';
import { RolePermissionEntity } from './secondary-adapters/orm/role-permission.schema';
import { RoleEntity } from './secondary-adapters/orm/role.schema';
import { UserEntity } from './secondary-adapters/orm/user.schema';
import { PermissionsController } from './permissions.controller';
import { RolesController } from './roles.controller';
import { UsersController } from './users.controller';
import { ResolveRolePermissionsService } from './core/application/services/resolve-role-permissions.service';
import { CachePort } from 'src/infrastructure/redis/cache/cache.port';
import {
  POSTGRES_USER_REPOSITORY,
  CACHED_USER_REPOSITORY,
} from './access.tokens';
import { PermissionSystemDataInitializer } from './core/application/lifecycle/permission-system-data.initializer';
import { RoleSystemDataInitializer } from './core/application/lifecycle/role-system-data.initializer';
import { PermissionRepository } from './core/domain/repositories/permission.repository';
import { RoleRepository } from './core/domain/repositories/role.repository';
import { UserRepository } from './core/domain/repositories/user.repository';
import { CachedUserRepository } from './secondary-adapters/repositories/cached-user-repository/cached-user.repository';
import { PostgresPermissionRepository } from './secondary-adapters/repositories/postgres-permission-repository/postgres-permission.repository';
import { PostgresRoleRepository } from './secondary-adapters/repositories/postgres-role-repository/postgres-role.repository';
import { PostgresUserRepository } from './secondary-adapters/repositories/postgres-user-repository/postgres-user.repository';
import { ActivateUserUseCase } from './core/application/usecases/user/activate-user/activate-user.usecase';
import { DeactivateUserUseCase } from './core/application/usecases/user/deactivate-user/deactivate-user.usecase';
import { FindAllPermissionsUseCase } from './core/application/usecases/permissions/find-all-permissions.usecase';
import { CreateRoleUseCase } from './core/application/usecases/role/create-role.usecase';
import { DeleteRoleUseCase } from './core/application/usecases/role/delete-role.usecase';
import { FindAllRolesUseCase } from './core/application/usecases/role/find-all-roles.usecase';
import { FindRoleByIdUseCase } from './core/application/usecases/role/find-role-by-id.usecase';
import { UpdateRoleUseCase } from './core/application/usecases/role/update-role.usecase';
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
import { SeedDemoAuthUsersUseCase } from './core/application/seed/seed-demo-auth-users.usecase';
import { SeedSuperAdminUseCase } from './core/application/seed/seed-super-admin.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      PermissionEntity,
      RolePermissionEntity,
      AddressEntity,
    ]),
    RedisModule,
  ],
  controllers: [RolesController, PermissionsController, UsersController],
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
      useExisting: CACHED_USER_REPOSITORY,
    },
    {
      provide: PermissionRepository,
      useClass: PostgresPermissionRepository,
    },
    {
      provide: RoleRepository,
      useClass: PostgresRoleRepository,
    },
    PermissionSystemDataInitializer,
    RoleSystemDataInitializer,
    ResolveRolePermissionsService,

    //usecases
    FindAllPermissionsUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    FindAllRolesUseCase,
    FindRoleByIdUseCase,
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
    SeedDemoAuthUsersUseCase,
    SeedSuperAdminUseCase,
  ],
  exports: [
    ResolveRolePermissionsService,
    CreateUserUseCase,
    GetUserUseCase,
    FindRoleByIdUseCase,
    GetUserByEmailUseCase,
    CheckEmailExistsUseCase,
  ],
})
export class AccessModule {}
