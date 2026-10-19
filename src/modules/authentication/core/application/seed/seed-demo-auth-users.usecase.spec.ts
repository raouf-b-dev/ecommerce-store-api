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
import { Credential } from '../../domain/entities/credential';

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
      .mockResolvedValueOnce(Result.success(superAdminUser))
      .mockResolvedValueOnce(Result.success(adminUser))
      .mockResolvedValueOnce(Result.success(customerUser));

    passwordHasher.hash.mockResolvedValue('hashed_password');
    credentialRepository.mockSuccessfulSave(
      Credential.create({
        userId: 1,
        passwordHash: 'hashed_password',
        mustChangePassword: true,
      }),
    );
    authorizationGateway.mockSuccessfulAssignRole();

    const result = await useCase.execute({ readOnly: false });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      superAdmin: {
        userId: 1,
        email: 'superadmin@store.local',
        status: 'created',
      },
      admin: { userId: 2, email: 'admin@store.local', status: 'created' },
      viewer: null,
      customer: { userId: 3, email: 'customer@store.local', status: 'created' },
    });
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

  it('should seed viewer and customer only when readOnly is true', async () => {
    identityGateway.mockFindUserByEmail(null);

    const viewerUser = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 10,
      email: 'viewer@store.local',
    });
    const customerUser = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 11,
      email: 'customer@store.local',
    });

    identityGateway.createUser
      .mockResolvedValueOnce(Result.success(viewerUser))
      .mockResolvedValueOnce(Result.success(customerUser));

    passwordHasher.hash.mockResolvedValue('hashed_password');
    credentialRepository.save.mockImplementation((credential) =>
      Promise.resolve(Result.success(credential)),
    );
    authorizationGateway.mockSuccessfulAssignRole();

    const result = await useCase.execute({ readOnly: true });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      superAdmin: null,
      admin: null,
      viewer: {
        userId: 10,
        email: 'viewer@store.local',
        status: 'created',
      },
      customer: {
        userId: 11,
        email: 'customer@store.local',
        status: 'created',
      },
    });
    expect(authorizationGateway.assignRole).toHaveBeenCalledWith(
      10,
      SystemRoleCode.ADMIN_READONLY,
    );
    expect(credentialRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ mustChangePassword: false }),
    );
    expect(identityGateway.findUserByEmail).toHaveBeenCalledWith(
      'superadmin@store.local',
    );
    expect(identityGateway.findUserByEmail).toHaveBeenCalledWith(
      'admin@store.local',
    );
    expect(identityGateway.createUser).toHaveBeenCalledTimes(2);
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
      .mockResolvedValueOnce(Result.success(existingSuperAdmin))
      .mockResolvedValueOnce(Result.success(existingAdmin))
      .mockResolvedValueOnce(Result.success(existingCustomer));

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

    const result = await useCase.execute({ readOnly: false });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      superAdmin: {
        userId: 1,
        email: 'superadmin@store.local',
        status: 'existing',
      },
      admin: { userId: 2, email: 'admin@store.local', status: 'existing' },
      viewer: null,
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
