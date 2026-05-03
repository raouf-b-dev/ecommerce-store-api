import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../guards/auth.guard';
import { PermissionsGuard } from './primary-adapters/guards/permissions.guard';
import { RequirePermissions } from './primary-adapters/decorators/require-permissions.decorator';
import {
  CreateRoleUseCase,
  CreateRoleDTO,
} from './core/application/usecases/role/create-role.usecase';
import {
  UpdateRoleUseCase,
  UpdateRoleDTO,
} from './core/application/usecases/role/update-role.usecase';
import { DeleteRoleUseCase } from './core/application/usecases/role/delete-role.usecase';
import { FindAllRolesUseCase } from './core/application/usecases/role/find-all-roles.usecase';
import { FindRoleByIdUseCase } from './core/application/usecases/role/find-role-by-id.usecase';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('manage_roles')
export class RolesController {
  constructor(
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
    private readonly findAllRolesUseCase: FindAllRolesUseCase,
    private readonly findRoleByIdUseCase: FindRoleByIdUseCase,
  ) {}

  @Get()
  async findAll() {
    return this.findAllRolesUseCase.execute();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.findRoleByIdUseCase.execute(id);
  }

  @Post()
  async create(@Body() dto: CreateRoleDTO) {
    return this.createRoleUseCase.execute(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Omit<UpdateRoleDTO, 'id'>,
  ) {
    return this.updateRoleUseCase.execute({ id, ...dto });
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.deleteRoleUseCase.execute(id);
  }
}
