import { Test, TestingModule } from '@nestjs/testing';
import { SeedDemoAuthUsersUseCase } from './seed-demo-auth-users.usecase';
import { PasswordHasher } from '../../../../../shared-kernel/domain/interfaces/password-hasher.interface';
import { IdentityGateway } from '../ports/identity.gateway';
import { AuthorizationGateway } from '../ports/authorization.gateway';
import { CredentialRepository } from '../../domain/repositories/credential.repository';
import { IdentityAccessGatewayMock } from '../../../testing/mocks/identity-access-gateway.mock';
import { AuthorizationGatewayMock } from '../../../testing/mocks/authorization-gateway.mock';
import { CredentialRepositoryMock } from '../../../testing/mocks/credential-repository.mock';
import { MockPasswordHasher } from '../../../testing/mocks/password-hasher.mock';
import { IdentityAccessGatewayDtoFactory } from '../../../testing/factories/indentity-gateway-dto.factory';
import { SystemRoleCode } from '../../../../authorization/core/domain/reference-data/system-roles';
import { ResultAssertionHelper } from '../../../../../testing';

describe('SeedDemoAuthUsersUseCase', () => {
  let useCase: SeedDemoAuthUsersUseCase;
  let identityGateway: IdentityAccessGatewayMock;
  let authorizationGateway: AuthorizationGatewayMock;
  let credentialRepository: CredentialRepositoryMock;
  let passwordHasher: MockPasswordHasher;

  beforeEach(async () => {
    identityGateway = new IdentityAccessGatewayMock();
    authorizationGateway = new AuthorizationGatewayMock();
    credentialRepository = new CredentialRepositoryMock();
    passwordHasher = new MockPasswordHasher();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedDemoAuthUsersUseCase,
        { provide: IdentityGateway, useValue: identityGateway },
        { provide: AuthorizationGateway, useValue: authorizationGateway },
        { provide: CredentialRepository, useValue: credentialRepository },
        { provide: PasswordHasher, useValue: passwordHasher },
      ],
    }).compile();

    useCase = module.get<SeedDemoAuthUsersUseCase>(SeedDemoAuthUsersUseCase);
  });

  it('should seed missing admin and customer users', async () => {
    identityGateway.mockFindUserByEmail(null);
    const adminUser = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 1,
      email: 'admin@store.local',
    });
    const customerUser = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 2,
      email: 'customer@store.local',
    });

    identityGateway.createUser
      .mockResolvedValueOnce({
        isSuccess: true,
        isFailure: false,
        value: adminUser,
      } as any)
      .mockResolvedValueOnce({
        isSuccess: true,
        isFailure: false,
        value: customerUser,
      } as any);

    passwordHasher.hash.mockResolvedValue('hashed_password');
    credentialRepository.save.mockImplementation((c) =>
      Promise.resolve({ isSuccess: true, isFailure: false, value: c } as any),
    );
    authorizationGateway.mockSuccessfulAssignRole();

    const result = await useCase.execute();

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      admin: { email: 'admin@store.local', status: 'created' },
      customer: { email: 'customer@store.local', status: 'created' },
    });
    expect(identityGateway.findUserByEmail).toHaveBeenCalledWith(
      'admin@store.local',
    );
    expect(identityGateway.findUserByEmail).toHaveBeenCalledWith(
      'customer@store.local',
    );
    expect(authorizationGateway.assignRole).toHaveBeenCalledWith(
      1,
      SystemRoleCode.ADMIN,
    );
    expect(authorizationGateway.assignRole).toHaveBeenCalledWith(
      2,
      SystemRoleCode.CUSTOMER,
    );
  });

  it('should skip creation if users already exist', async () => {
    const existingAdmin = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 1,
      email: 'admin@store.local',
    });
    const existingCustomer = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 2,
      email: 'customer@store.local',
    });

    identityGateway.findUserByEmail
      .mockResolvedValueOnce({
        isSuccess: true,
        isFailure: false,
        value: existingAdmin,
      } as any)
      .mockResolvedValueOnce({
        isSuccess: true,
        isFailure: false,
        value: existingCustomer,
      } as any);

    const result = await useCase.execute();

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      admin: { email: 'admin@store.local', status: 'existing' },
      customer: { email: 'customer@store.local', status: 'existing' },
    });
    expect(identityGateway.createUser).not.toHaveBeenCalled();
    expect(credentialRepository.save).not.toHaveBeenCalled();
  });
});
