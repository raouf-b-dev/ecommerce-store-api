import { Test, TestingModule } from '@nestjs/testing';
import { UpdateNotificationStatusService } from './update-notification-status.service';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NotificationStatus } from '../../domain/enums/notification-status.enum';
import {
  MockNotificationRepository,
  NotificationDtoTestFactory,
} from 'src/modules/notifications/testing';
import { ResultAssertionHelper } from 'src/testing';
import { UseCaseError } from 'src/shared-kernel/domain/exceptions/usecase.error';
import { ErrorCode } from 'src/shared-kernel/domain/exceptions/error-code';
import { ErrorKind } from 'src/shared-kernel/domain/exceptions/error-kind';
import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';

describe('UpdateNotificationStatusService', () => {
  let service: UpdateNotificationStatusService;
  let repository: MockNotificationRepository;

  beforeEach(async () => {
    repository = new MockNotificationRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateNotificationStatusService,
        {
          provide: NotificationRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(UpdateNotificationStatusService);
  });

  afterEach(() => {
    repository.reset();
  });

  it('marks notification as delivered when found', async () => {
    const notification = NotificationDtoTestFactory.createEntity();
    repository.mockSuccessfulFind(notification);
    repository.mockSuccessfulSave();

    const result = await service.execute({
      notificationId: notification.id,
      status: NotificationStatus.DELIVERED,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(repository.save).toHaveBeenCalledWith(notification);
    expect(notification.status).toBe(NotificationStatus.DELIVERED);
  });

  it('returns NOTIFICATION_NOT_FOUND when missing', async () => {
    repository.mockSuccessfulFind(null);

    const result = await service.execute({
      notificationId: 'missing',
      status: NotificationStatus.READ,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Notification missing not found',
      UseCaseError,
    );
    expect(result.error.code).toBe(ErrorCode.NOTIFICATION_NOT_FOUND);
    expect(result.error.kind).toBe(ErrorKind.NOT_FOUND);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('propagates repository find failure', async () => {
    repository.mockFindFailure('DB down');

    const result = await service.execute({
      notificationId: 'n1',
      status: NotificationStatus.FAILED,
      reason: 'bounce',
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'DB down',
      InfrastructureError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });
});
