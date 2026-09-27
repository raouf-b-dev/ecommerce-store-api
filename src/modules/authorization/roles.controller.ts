import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateRoleUseCase } from './core/application/usecases/role/create-role.usecase';
import { UpdateRoleUseCase } from './core/application/usecases/role/update-role.usecase';
import { DeleteRoleUseCase } from './core/application/usecases/role/delete-role.usecase';
import { FindAllRolesUseCase } from './core/application/usecases/role/find-all-roles.usecase';
import { FindRoleByIdUseCase } from './core/application/usecases/role/find-role-by-id.usecase';
import { CreateRoleDto } from './primary-adapter/dto/create-role.dto';
import { UpdateRoleDto } from './primary-adapter/dto/update-role.dto';
import { RoleResponseDto } from './primary-adapter/dto/role-response.dto';
import { RequirePermissions } from './primary-adapter/decorators/require-permissions.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
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
  @RequirePermissions('manage_roles', 'view_all_users')
  @ApiOperation({ summary: 'List all roles' })
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  async findAll() {
    return this.findAllRolesUseCase.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.findRoleByIdUseCase.execute(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a custom role' })
  @ApiResponse({ status: 201, type: RoleResponseDto })
  async create(@Body() dto: CreateRoleDto) {
    return this.createRoleUseCase.execute(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a custom role' })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.updateRoleUseCase.execute({ ...dto, id });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a custom role' })
  @ApiResponse({ status: 204, description: 'Role deleted' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.deleteRoleUseCase.execute(id);
  }
}
