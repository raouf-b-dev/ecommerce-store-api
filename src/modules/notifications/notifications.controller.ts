import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../identity/primary-adapters/decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { GetUserNotificationsUseCase } from './core/application/usecases/get-user-notifications.usecase';
import { MarkNotificationAsReadUseCase } from './core/application/usecases/mark-notification-as-read.usecase';
import { GetUserNotificationsDto } from './primary-adapters/dto/get-user-notifications.dto';
import { UserNotificationsResponseDto } from './primary-adapters/dto/notification-response.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly getUserNotificationsUseCase: GetUserNotificationsUseCase,
    private readonly markNotificationAsReadUseCase: MarkNotificationAsReadUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiOkResponse({ type: UserNotificationsResponseDto })
  async getUserNotifications(
    @CurrentUser('userId') userId: string,
    @Query() query: GetUserNotificationsDto,
  ) {
    return this.getUserNotificationsUseCase.execute({
      userId,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
    });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read (empty body)',
  })
  async markAsRead(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.markNotificationAsReadUseCase.execute(id, userId);
  }
}
