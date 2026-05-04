import {
  Controller,
  Post,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ActivateUserUseCase } from './core/application/usecases/activate-user/activate-user.usecase';
import { DeactivateUserUseCase } from './core/application/usecases/deactivate-user/deactivate-user.usecase';
import { AuthGuard } from '../../guards/auth.guard';
import { PermissionsGuard } from './primary-adapters/guards/permissions.guard';
import { RequirePermissions } from './primary-adapters/decorators/require-permissions.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('manage_users')
export class UsersController {
  constructor(
    private readonly activateUserUseCase: ActivateUserUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
  ) {}

  @Post(':id/activate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Activate a user account (Admin)' })
  @ApiResponse({ status: 204, description: 'User activated successfully' })
  @ApiResponse({ status: 400, description: 'User is already active' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires manage_users permission',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async activate(@Param('id', ParseIntPipe) id: number) {
    return this.activateUserUseCase.execute(id);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deactivate a user account and revoke sessions (Admin)',
  })
  @ApiResponse({ status: 204, description: 'User deactivated successfully' })
  @ApiResponse({ status: 400, description: 'User is already deactivated' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires manage_users permission',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.deactivateUserUseCase.execute(id);
  }
}
