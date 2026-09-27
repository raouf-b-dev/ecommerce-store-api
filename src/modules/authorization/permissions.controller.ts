import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from './primary-adapter/decorators/require-permissions.decorator';
import { FindAllPermissionsUseCase } from './core/application/usecases/permissions/find-all-permissions/find-all-permissions.usecase';
import { PermissionResponseDto } from './primary-adapter/dto/permission-response.dto';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
@RequirePermissions('manage_roles')
export class PermissionsController {
  constructor(
    private readonly findAllPermissionsUseCase: FindAllPermissionsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all permission definitions' })
  @ApiOkResponse({ type: [PermissionResponseDto] })
  async findAll() {
    return this.findAllPermissionsUseCase.execute();
  }
}
