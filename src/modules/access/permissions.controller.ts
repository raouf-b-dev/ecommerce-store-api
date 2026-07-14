import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions } from './primary-adapters/decorators/require-permissions.decorator';
import { FindAllPermissionsUseCase } from './core/application/usecases/permissions/find-all-permissions.usecase';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
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
