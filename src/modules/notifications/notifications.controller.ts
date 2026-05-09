import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/primary-adapters/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { GetUserNotificationsUseCase } from './core/application/usecases/get-user-notifications.usecase';
import { MarkNotificationAsReadUseCase } from './core/application/usecases/mark-notification-as-read.usecase';
import { GetUserNotificationsDto } from './primary-adapters/dto/get-user-notifications.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly getUserNotificationsUseCase: GetUserNotificationsUseCase,
    private readonly markNotificationAsReadUseCase: MarkNotificationAsReadUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
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
  async markAsRead(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.markNotificationAsReadUseCase.execute(id, userId);
  }
}
