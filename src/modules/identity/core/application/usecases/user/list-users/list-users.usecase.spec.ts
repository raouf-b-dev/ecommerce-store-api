import { ListUsersUseCase } from './list-users.usecase';
import { MockUserQueryService } from '../../../../../testing/mocks/user-query-service.mock';
import { UserDtoTestFactory } from '../../../../../testing/factories/user-dto.factory';
import { ResultAssertionHelper } from '../../../../../../../testing';

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase;
  let mockUserQueryService: MockUserQueryService;

  beforeEach(() => {
    mockUserQueryService = new MockUserQueryService();
    useCase = new ListUsersUseCase(mockUserQueryService);
  });

  afterEach(() => {
    mockUserQueryService.reset();
  });

  describe('execute', () => {
    it('should return Success with paginated users', async () => {
      const sampleItem = UserDtoTestFactory.createUserListItemDTO();
      mockUserQueryService.mockSuccessfulList([sampleItem], 1);

      const result = await useCase.execute({ page: 1, limit: 10 });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.items).toEqual([sampleItem]);
      expect(mockUserQueryService.list).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });
  });
});
