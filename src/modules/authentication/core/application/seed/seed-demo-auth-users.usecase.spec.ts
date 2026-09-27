import { Test, TestingModule } from '@nestjs/testing';
import { SeedDemoAuthUsersUseCase } from './seed-demo-auth-users.usecase';
import { PasswordHasher } from '../../../../../shared-kernel/domain/interfaces/password-hasher.interface';
import { IdentityGateway } from '../ports/identity.gateway';
import { AuthorizationGateway } from '../ports/authorization.gateway';
import { CredentialRepository } from '../../domain/repositories/credential.repository';
import {
  AuthenticationDtoFactory,
  IdentityAccessGatewayMock,
  AuthorizationGatewayMock,
  CredentialRepositoryMock,
  MockPasswordHasher,
  IdentityAccessGatewayDtoFactory,
} from 'src/modules/authentication/testing';
import { SystemRoleCode } from '../../../../../shared-kernel/domain/value-objects/system-roles';
import { ResultAssertionHelper } from '../../../../../testing';
import { Result } from '../../../../../shared-kernel/domain/result';

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

  it('should seed missing super admin, admin, and customer users', async () => {
    identityGateway.mockFindUserByEmail(null);
    const superAdminUser = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 1,
      email: 'superadmin@store.local',
    });
    const adminUser = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 2,
      email: 'admin@store.local',
    });
    const customerUser = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 3,
      email: 'customer@store.local',
    });

    identityGateway.createUser
      .mockResolvedValueOnce({
        isSuccess: true,
        isFailure: false,
        value: superAdminUser,
      } as any)
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
      superAdmin: {
        userId: 1,
        email: 'superadmin@store.local',
        status: 'created',
      },
      admin: { userId: 2, email: 'admin@store.local', status: 'created' },
      customer: { userId: 3, email: 'customer@store.local', status: 'created' },
    });
    expect(identityGateway.findUserByEmail).toHaveBeenCalledWith(
      'superadmin@store.local',
    );
    expect(identityGateway.findUserByEmail).toHaveBeenCalledWith(
      'admin@store.local',
    );
    expect(identityGateway.findUserByEmail).toHaveBeenCalledWith(
      'customer@store.local',
    );
    expect(authorizationGateway.assignRole).toHaveBeenCalledWith(
      1,
      SystemRoleCode.SUPER_ADMIN,
    );
    expect(authorizationGateway.assignRole).toHaveBeenCalledWith(
      2,
      SystemRoleCode.ADMIN,
    );
    expect(authorizationGateway.assignRole).toHaveBeenCalledWith(
      3,
      SystemRoleCode.CUSTOMER,
    );
  });

  it('should skip creation if users already exist', async () => {
    const existingSuperAdmin = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 1,
      email: 'superadmin@store.local',
    });
    const existingAdmin = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 2,
      email: 'admin@store.local',
    });
    const existingCustomer = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 3,
      email: 'customer@store.local',
    });

    identityGateway.findUserByEmail
      .mockResolvedValueOnce({
        isSuccess: true,
        isFailure: false,
        value: existingSuperAdmin,
      } as any)
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

    credentialRepository.findByUserId.mockImplementation((userId: number) =>
      Promise.resolve(
        Result.success(
          AuthenticationDtoFactory.buildPersistedCredentialEntity({
            id: userId,
            userId,
            passwordHash: 'old-hash',
            mustChangePassword: false,
          }),
        ),
      ),
    );
    credentialRepository.mockSuccessfulUpdate();
    passwordHasher.hash.mockResolvedValue('reset-hash');

    const result = await useCase.execute();

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      superAdmin: {
        userId: 1,
        email: 'superadmin@store.local',
        status: 'existing',
      },
      admin: { userId: 2, email: 'admin@store.local', status: 'existing' },
      customer: {
        userId: 3,
        email: 'customer@store.local',
        status: 'existing',
      },
    });
    expect(identityGateway.createUser).not.toHaveBeenCalled();
    expect(credentialRepository.save).not.toHaveBeenCalled();
    expect(credentialRepository.findByUserId).toHaveBeenCalledTimes(3);
    expect(credentialRepository.update).toHaveBeenCalledTimes(3);
    expect(passwordHasher.hash).toHaveBeenCalledWith('SuperAdmin123!');
    expect(passwordHasher.hash).toHaveBeenCalledWith('Admin123!');
    expect(passwordHasher.hash).toHaveBeenCalledWith('Customer123!');
  });
});
