import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../guards/auth.guard';
import { PermissionsGuard } from './primary-adapters/guards/permissions.guard';
import { RequirePermissions } from './primary-adapters/decorators/require-permissions.decorator';
import { FindAllPermissionsUseCase } from './core/application/usecases/find-all-permissions.usecase';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('manage_roles')
export class PermissionsController {
  constructor(
    private readonly findAllPermissionsUseCase: FindAllPermissionsUseCase,
  ) {}

  @Get()
  async findAll() {
    return this.findAllPermissionsUseCase.execute();
  }
}
