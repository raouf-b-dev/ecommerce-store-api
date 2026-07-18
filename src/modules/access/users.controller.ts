import {
  Controller,
  Post,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Body,
  Delete,
  Patch,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ActivateUserUseCase } from './core/application/usecases/user/activate-user/activate-user.usecase';
import { DeactivateUserUseCase } from './core/application/usecases/user/deactivate-user/deactivate-user.usecase';
import { RequirePermissions } from './primary-adapters/decorators/require-permissions.decorator';
import { CallerContext } from 'src/shared-kernel/domain/interfaces/caller-context.interface';
import { GetUserUseCase } from './core/application/usecases/user/get-user/get-user.usecase';
import { ListUsersUseCase } from './core/application/usecases/user/list-users/list-users.usecase';
import { UpdateUserUseCase } from './core/application/usecases/user/update-user/update-user.usecase';
import { DeleteUserUseCase } from './core/application/usecases/user/delete-user/delete-user.usecase';
import { ListUsersQueryDto } from './primary-adapters/dto/list-users-query.dto';
import { UpdateUserDto } from './primary-adapters/dto/update-user.dto';
import { UserResponseDto } from './primary-adapters/dto/user-response.dto';
import { CallerCtx } from './primary-adapters/decorators';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@RequirePermissions('manage_users')
export class UsersController {
  constructor(
    private readonly getUserUseCase: GetUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly activateUserUseCase: ActivateUserUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
  ) {}

  @Get()
  @RequirePermissions('view_all_users')
  @ApiOperation({ summary: 'List all users with pagination' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async listUsers(@Query() query: ListUsersQueryDto) {
    return await this.listUsersUseCase.execute(query);
  }

  @Get(':id')
  @RequirePermissions('view_all_users', 'view_own_profile')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async getUser(
    @Param('id', ParseIntPipe) id: number,
    @CallerCtx() callerContext: CallerContext,
  ) {
    return await this.getUserUseCase.execute({
      userId: id,
      callerContext,
    });
  }

  @Patch(':id')
  @RequirePermissions('manage_users')
  @ApiOperation({ summary: 'Update user information' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return await this.updateUserUseCase.execute({
      id: id,
      command: dto,
    });
  }

  @Delete(':id')
  @RequirePermissions('manage_users')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    return await this.deleteUserUseCase.execute(id);
  }

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
