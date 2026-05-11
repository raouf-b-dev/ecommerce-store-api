import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgresUserRepository } from './secondary-adapters/repositories/postgres-user-repository/postgres-user.repository';
import { CachedUserRepository } from './secondary-adapters/repositories/cached-user-repository/cached-user.repository';
import { PostgresSessionTokenRepository } from './secondary-adapters/repositories/postgres-session-token-repository/postgres-session-token.repository';
import { BcryptService } from './secondary-adapters/services/bcrypt.service';
import { PasswordHasher } from '../../shared-kernel/domain/interfaces/password-hasher.interface';
import { UserEntity } from './secondary-adapters/orm/user.schema';
import { SessionTokenEntity } from './secondary-adapters/orm/session-token.schema';
import { CustomersModule } from '../customers/customers.module';
import { UserRepository } from './core/domain/repositories/user.repository';
import { SessionTokenRepository } from './core/domain/repositories/session-token.repository';
import { PermissionRepository } from './core/domain/repositories/permission.repository';
import { RoleRepository } from './core/domain/repositories/role.repository';
import { RoleEntity } from './secondary-adapters/orm/role.schema';
import { PermissionEntity } from './secondary-adapters/orm/permission.schema';
import { RolePermissionEntity } from './secondary-adapters/orm/role-permission.schema';
import { PostgresPermissionRepository } from './secondary-adapters/repositories/postgres-permission-repository/postgres-permission.repository';
import { PostgresRoleRepository } from './secondary-adapters/repositories/postgres-role-repository/postgres-role.repository';
import { PermissionSystemDataInitializer } from './core/application/lifecycle/permission-system-data.initializer';
import { RoleSystemDataInitializer } from './core/application/lifecycle/role-system-data.initializer';
import { ResolveRolePermissionsService } from './core/application/services/resolve-role-permissions.service';
import { AuthController } from './auth.controller';
import { LoginUserUseCase } from './core/application/usecases/login-user/login-user.usecase';
import { RegisterUserUseCase } from './core/application/usecases/register-user/register-user.usecase';
import { RefreshTokenUseCase } from './core/application/usecases/refresh-token/refresh-token.usecase';
import { LogoutUseCase } from './core/application/usecases/logout/logout.usecase';
import { LogoutAllUseCase } from './core/application/usecases/logout-all/logout-all.usecase';
import { FindAllPermissionsUseCase } from './core/application/usecases/find-all-permissions.usecase';
import { CreateRoleUseCase } from './core/application/usecases/role/create-role.usecase';
import { UpdateRoleUseCase } from './core/application/usecases/role/update-role.usecase';
import { DeleteRoleUseCase } from './core/application/usecases/role/delete-role.usecase';
import { FindAllRolesUseCase } from './core/application/usecases/role/find-all-roles.usecase';
import { FindRoleByIdUseCase } from './core/application/usecases/role/find-role-by-id.usecase';
import { ActivateUserUseCase } from './core/application/usecases/activate-user/activate-user.usecase';
import { DeactivateUserUseCase } from './core/application/usecases/deactivate-user/deactivate-user.usecase';
import { RefreshTokenCookieInterceptor } from './primary-adapters/interceptors/refresh-token-cookie.interceptor';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';
import { UsersController } from './users.controller';
import {
  POSTGRES_USER_REPOSITORY,
  CACHED_USER_REPOSITORY,
  CUSTOMER_GATEWAY,
} from './auth.tokens';
import { ModuleCustomerGateway } from './secondary-adapters/adapters/module-customer.gateway';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { CacheService } from '../../infrastructure/redis/cache/cache.service';
import { EnvConfigService } from '../../config/env-config.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      SessionTokenEntity,
      RoleEntity,
      PermissionEntity,
      RolePermissionEntity,
    ]),
    CustomersModule,
    RedisModule,
  ],
  controllers: [
    AuthController,
    RolesController,
    PermissionsController,
    UsersController,
  ],
  providers: [
    {
      provide: PasswordHasher,
      useClass: BcryptService,
    },
    {
      provide: POSTGRES_USER_REPOSITORY,
      useClass: PostgresUserRepository,
    },
    {
      provide: CACHED_USER_REPOSITORY,
      useFactory: (
        cacheService: CacheService,
        postgresRepo: PostgresUserRepository,
      ) => {
        return new CachedUserRepository(cacheService, postgresRepo);
      },
      inject: [CacheService, POSTGRES_USER_REPOSITORY],
    },
    {
      provide: UserRepository,
      useExisting: CACHED_USER_REPOSITORY,
    },
    {
      provide: SessionTokenRepository,
      useClass: PostgresSessionTokenRepository,
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

    // Gateways
    {
      provide: CUSTOMER_GATEWAY,
      useClass: ModuleCustomerGateway,
    },

    // Use Cases
    RegisterUserUseCase,
    LoginUserUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    LogoutAllUseCase,
    FindAllPermissionsUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    FindAllRolesUseCase,
    FindRoleByIdUseCase,
    ActivateUserUseCase,
    DeactivateUserUseCase,
    RefreshTokenCookieInterceptor,
  ],
  exports: [ResolveRolePermissionsService],
})
export class AuthModule {}
