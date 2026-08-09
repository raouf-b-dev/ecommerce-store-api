import { DeactivateUserUseCase } from './deactivate-user.usecase';
import { MockUserRepository } from '../../../../../testing/mocks/user-repository.mock';
import { UserTestFactory } from '../../../../../testing/factories/user.factory';
import { ResultAssertionHelper } from '../../../../../../../testing';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { DomainError } from '../../../../../../../shared-kernel/domain/exceptions/domain.error';
import { DomainEventPublisher } from '../../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';

describe('DeactivateUserUseCase', () => {
  let usecase: DeactivateUserUseCase;
  let userRepository: MockUserRepository;
  let domainEventPublisher: jest.Mocked<DomainEventPublisher>;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    domainEventPublisher = {
      publish: jest.fn(),
    };
    usecase = new DeactivateUserUseCase(userRepository, domainEventPublisher);
  });

  it('should deactivate a user and publish event', async () => {
    const userData = UserTestFactory.createMockUser({ isActive: true });
    userRepository.mockSuccessfulFindByIdForUpdate(userData);
    userRepository.mockSuccessfulSave();

    const result = await usecase.execute(1);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(userRepository.save).toHaveBeenCalled();
    expect(domainEventPublisher.publish).toHaveBeenCalledWith(
      'user.deactivated',
      { userId: 1 },
    );
  });

  it('should return failure if user is already deactivated', async () => {
    const userData = UserTestFactory.createMockUser({ isActive: false });
    userRepository.mockSuccessfulFindByIdForUpdate(userData);

    const result = await usecase.execute(1);

    ResultAssertionHelper.assertResultFailure(
      result,
      'User is already deactivated',
      DomainError,
    );
    expect(userRepository.save).not.toHaveBeenCalled();
    expect(domainEventPublisher.publish).not.toHaveBeenCalled();
  });

  it('should return failure if user not found', async () => {
    userRepository.mockUserNotFound();

    const result = await usecase.execute(999);

    ResultAssertionHelper.assertResultFailure(
      result,
      'User not found',
      UseCaseError,
    );
    expect(domainEventPublisher.publish).not.toHaveBeenCalled();
  });
});
