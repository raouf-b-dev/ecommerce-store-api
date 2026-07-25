import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from 'src/infrastructure/redis/redis.module';
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
import { RoleEntity } from './secondary-adapter/orm/role.schema';
import { UserRoleAssignmentEntity } from './secondary-adapter/orm/user-role-assignment.schema';
import { UserRoleAssignmentRepository } from './core/domain/repositories/user-role-assignment.repository';
import { PostgresUserRoleAssignmentRepository } from './secondary-adapter/repositories/postgres-user-role-assignment-repository/postgres-user-role-assignment.repository';

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
      provide: RoleRepository,
      useClass: PostgresRoleRepository,
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
  ],
  exports: [ResolveRolePermissionsService, FindRoleByIdUseCase],
})
export class AuthorizationModule {}
