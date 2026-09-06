import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from 'src/infrastructure/redis/redis.module';
import { CachePort } from '../../shared-kernel/domain/interfaces/cache.port';
import { PermissionSystemDataInitializer } from './core/application/lifecycle/permission-system-data.initializer';
import { RoleSystemDataInitializer } from './core/application/lifecycle/role-system-data.initializer';
import { ResolveRolePermissionsService } from './core/application/services/resolve-role-permissions.service';
import { FindAllPermissionsUseCase } from './core/application/usecases/permissions/find-all-permissions/find-all-permissions.usecase';
import { CreateRoleUseCase } from './core/application/usecases/role/create-role.usecase';
import { DeleteRoleUseCase } from './core/application/usecases/role/delete-role.usecase';
import { FindAllRolesUseCase } from './core/application/usecases/role/find-all-roles.usecase';
import { FindRoleByIdUseCase } from './core/application/usecases/role/find-role-by-id.usecase';
import { UpdateRoleUseCase } from './core/application/usecases/role/update-role.usecase';
import { PermissionRepository } from './core/domain/repositories/permission.repository';
import { RoleRepository } from './core/domain/repositories/role.repository';
import { PermissionsController } from './permissions.controller';
import { RolesController } from './roles.controller';
import { PermissionEntity } from './secondary-adapter/orm/permission.schema';
import { RolePermissionEntity } from './secondary-adapter/orm/role-permission.schema';
import { PostgresPermissionRepository } from './secondary-adapter/repositories/postgres-permission-repository/postgres-permission.repository';
import { PostgresRoleRepository } from './secondary-adapter/repositories/postgres-role-repository/postgres-role.repository';
import { CachedRoleRepository } from './secondary-adapter/repositories/cached-role-repository/cached-role.repository';
import { RoleEntity } from './secondary-adapter/orm/role.schema';
import { UserRoleAssignmentEntity } from './secondary-adapter/orm/user-role-assignment.schema';
import { UserRoleAssignmentRepository } from './core/domain/repositories/user-role-assignment.repository';
import { AssignRoleUseCase } from './core/application/usecases/user-role/assign-role.usecase';
import { AssignDefaultRoleUseCase } from './core/application/usecases/user-role/assign-default-role.usecase';
import { FindRoleByUserIdUseCase } from './core/application/usecases/user-role/find-role-by-user-id.usecase';
import { PostgresUserRoleAssignmentRepository } from './secondary-adapter/repositories/postgres-user-role-assignment-repository/postgres-user-role-assignment.repository';
import {
  CACHED_ROLE_REPOSITORY,
  POSTGRES_ROLE_REPOSITORY,
} from './authorization.token';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoleEntity,
      PermissionEntity,
      RolePermissionEntity,
      UserRoleAssignmentEntity,
    ]),
    RedisModule,
  ],
  controllers: [RolesController, PermissionsController],
  providers: [
    {
      provide: PermissionRepository,
      useClass: PostgresPermissionRepository,
    },
    {
      provide: POSTGRES_ROLE_REPOSITORY,
      useClass: PostgresRoleRepository,
    },
    {
      provide: CACHED_ROLE_REPOSITORY,
      useFactory: (
        cacheService: CachePort,
        postgresRepo: PostgresRoleRepository,
      ) =>
        new CachedRoleRepository(
          cacheService,
          postgresRepo,
          new Logger(CachedRoleRepository.name),
        ),
      inject: [CachePort, POSTGRES_ROLE_REPOSITORY],
    },
    {
      provide: RoleRepository,
      useExisting: CACHED_ROLE_REPOSITORY,
    },
    {
      provide: UserRoleAssignmentRepository,
      useClass: PostgresUserRoleAssignmentRepository,
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
    AssignRoleUseCase,
    AssignDefaultRoleUseCase,
    FindRoleByUserIdUseCase,
  ],
  exports: [
    ResolveRolePermissionsService,
    FindRoleByIdUseCase,
    AssignRoleUseCase,
    AssignDefaultRoleUseCase,
    FindRoleByUserIdUseCase,
  ],
})
export class AuthorizationModule {}
