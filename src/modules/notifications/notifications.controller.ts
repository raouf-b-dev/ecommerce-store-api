import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/modules/auth/guards/auth.guard';
import { GetUserNotificationsUseCase } from './core/application/usecases/get-user-notifications.usecase';
import { MarkNotificationAsReadUseCase } from './core/application/usecases/mark-notification-as-read.usecase';
import { NotificationStatus } from './core/domain/enums/notification-status.enum';
import { isFailure } from 'src/shared-kernel/domain/result';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly getUserNotificationsUseCase: GetUserNotificationsUseCase,
    private readonly markNotificationAsReadUseCase: MarkNotificationAsReadUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  async getUserNotifications(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: NotificationStatus,
  ) {
    const result = await this.getUserNotificationsUseCase.execute({
      userId: req.user.userId,
      page: Number(page),
      limit: Number(limit),
      status,
    });
    if (isFailure(result)) throw result.error;
    return {
      ...result.value,
      data: result.value.data.map((n) => n.toPrimitives()),
    };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Request() req, @Param('id') id: string) {
    return await this.markNotificationAsReadUseCase.execute(
      id,
      req.user.userId,
    );
  }
}
