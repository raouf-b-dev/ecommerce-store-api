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

const DEFAULT_ACCOUNTS = {
  superAdmin: {
    email: 'superadmin@store.local',
    password: 'SuperAdmin123!',
  },
  admin: { email: 'admin@store.local', password: 'Admin123!' },
  viewer: { email: 'viewer@store.local', password: 'Viewer123!' },
  customer: { email: 'customer@store.local', password: 'Customer123!' },
};

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

    const result = await useCase.execute({
      readOnly: false,
      accounts: DEFAULT_ACCOUNTS,
    });

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

    const result = await useCase.execute({
      readOnly: true,
      accounts: DEFAULT_ACCOUNTS,
    });

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
      'viewer@store.local',
    );
    expect(identityGateway.findUserByEmail).toHaveBeenCalledWith(
      'customer@store.local',
    );
    expect(identityGateway.findUserByEmail).not.toHaveBeenCalledWith(
      'superadmin@store.local',
    );
    expect(identityGateway.findUserByEmail).not.toHaveBeenCalledWith(
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

    const result = await useCase.execute({
      readOnly: false,
      accounts: DEFAULT_ACCOUNTS,
    });

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

  it('should seed credentials from the input accounts', async () => {
    identityGateway.mockFindUserByEmail(null);
    const viewerUser = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 20,
      email: 'ops-viewer@example.com',
    });
    const customerUser = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 21,
      email: 'fixture@example.com',
    });

    identityGateway.createUser
      .mockResolvedValueOnce(Result.success(viewerUser))
      .mockResolvedValueOnce(Result.success(customerUser));
    passwordHasher.hash.mockResolvedValue('hashed_password');
    credentialRepository.save.mockImplementation((credential) =>
      Promise.resolve(Result.success(credential)),
    );
    authorizationGateway.mockSuccessfulAssignRole();

    const result = await useCase.execute({
      readOnly: true,
      accounts: {
        ...DEFAULT_ACCOUNTS,
        viewer: {
          email: 'ops-viewer@example.com',
          password: 'HostedViewer!',
        },
        customer: {
          email: 'fixture@example.com',
          password: 'FixtureCust!',
        },
      },
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value.viewer?.email).toBe('ops-viewer@example.com');
    expect(result.value.customer.email).toBe('fixture@example.com');
    expect(passwordHasher.hash).toHaveBeenCalledWith('HostedViewer!');
    expect(passwordHasher.hash).toHaveBeenCalledWith('FixtureCust!');
  });

  describe('existing accounts in read-only mode', () => {
    const existingViewer = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 30,
      email: 'viewer@store.local',
    });
    const existingCustomer = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 31,
      email: 'customer@store.local',
    });

    const persistedCredential = (userId: number) =>
      AuthenticationDtoFactory.buildPersistedCredentialEntity({
        id: userId,
        userId,
        passwordHash: 'old-hash',
        mustChangePassword: false,
      });

    it('should refuse to reseed an admin account at the viewer email and leave its credentials untouched', async () => {
      identityGateway.findUserByEmail.mockResolvedValueOnce(
        Result.success(existingViewer),
      );
      authorizationGateway.mockSuccessfulFindRoleByUserId({
        id: 1,
        code: SystemRoleCode.SUPER_ADMIN,
        permissions: [],
      });

      const result = await useCase.execute({
        readOnly: true,
        accounts: DEFAULT_ACCOUNTS,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Refusing to reseed viewer@store.local: existing account has role SUPER_ADMIN, expected ADMIN_READONLY',
      );
      expect(authorizationGateway.findRoleByUserId).toHaveBeenCalledWith(30);
      expect(credentialRepository.findByUserId).not.toHaveBeenCalled();
      expect(credentialRepository.update).not.toHaveBeenCalled();
      expect(passwordHasher.hash).not.toHaveBeenCalled();
      expect(identityGateway.findUserByEmail).toHaveBeenCalledTimes(1);
    });

    it('should refuse to reseed an existing account that has no role', async () => {
      identityGateway.findUserByEmail.mockResolvedValueOnce(
        Result.success(existingViewer),
      );
      authorizationGateway.mockSuccessfulFindRoleByUserId(null);

      const result = await useCase.execute({
        readOnly: true,
        accounts: DEFAULT_ACCOUNTS,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Refusing to reseed viewer@store.local: existing account has role none, expected ADMIN_READONLY',
      );
      expect(credentialRepository.update).not.toHaveBeenCalled();
    });

    it('should fail when the existing role cannot be read', async () => {
      identityGateway.findUserByEmail.mockResolvedValueOnce(
        Result.success(existingViewer),
      );
      authorizationGateway.mockFailedFindRoleByUserId('role lookup failed');

      const result = await useCase.execute({
        readOnly: true,
        accounts: DEFAULT_ACCOUNTS,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to read role for existing user viewer@store.local',
      );
      expect(credentialRepository.update).not.toHaveBeenCalled();
    });

    it('should reseed existing viewer and customer accounts that hold the expected roles', async () => {
      identityGateway.findUserByEmail
        .mockResolvedValueOnce(Result.success(existingViewer))
        .mockResolvedValueOnce(Result.success(existingCustomer));
      authorizationGateway.findRoleByUserId
        .mockResolvedValueOnce(
          Result.success({
            id: 3,
            code: SystemRoleCode.ADMIN_READONLY,
            permissions: [],
          }),
        )
        .mockResolvedValueOnce(
          Result.success({
            id: 4,
            code: SystemRoleCode.CUSTOMER,
            permissions: [],
          }),
        );
      credentialRepository.findByUserId.mockImplementation((userId: number) =>
        Promise.resolve(Result.success(persistedCredential(userId))),
      );
      credentialRepository.mockSuccessfulUpdate();
      passwordHasher.hash.mockResolvedValue('reset-hash');

      const result = await useCase.execute({
        readOnly: true,
        accounts: DEFAULT_ACCOUNTS,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual({
        superAdmin: null,
        admin: null,
        viewer: { userId: 30, email: 'viewer@store.local', status: 'existing' },
        customer: {
          userId: 31,
          email: 'customer@store.local',
          status: 'existing',
        },
      });
      expect(credentialRepository.update).toHaveBeenCalledTimes(2);
      expect(passwordHasher.hash).toHaveBeenCalledWith('Viewer123!');
      expect(passwordHasher.hash).toHaveBeenCalledWith('Customer123!');
    });
  });

  describe('existing account credential reset', () => {
    const existingSuperAdmin = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 40,
      email: 'superadmin@store.local',
    });

    it('should not check roles outside read-only mode', async () => {
      identityGateway.findUserByEmail.mockResolvedValue(
        Result.success(existingSuperAdmin),
      );
      credentialRepository.mockSuccessfulFindByUserId(
        AuthenticationDtoFactory.buildPersistedCredentialEntity({
          id: 40,
          userId: 40,
        }),
      );
      credentialRepository.mockSuccessfulUpdate();
      passwordHasher.hash.mockResolvedValue('reset-hash');

      const result = await useCase.execute({
        readOnly: false,
        accounts: DEFAULT_ACCOUNTS,
      });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(authorizationGateway.findRoleByUserId).not.toHaveBeenCalled();
    });

    it('should fail when an existing user has no credentials', async () => {
      identityGateway.findUserByEmail.mockResolvedValueOnce(
        Result.success(existingSuperAdmin),
      );
      credentialRepository.findByUserId.mockResolvedValueOnce(
        Result.success(null),
      );

      const result = await useCase.execute({
        readOnly: false,
        accounts: DEFAULT_ACCOUNTS,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Existing user superadmin@store.local has no credentials; remove the account or restore its credentials before re-seeding',
      );
      expect(credentialRepository.update).not.toHaveBeenCalled();
    });

    it('should fail when the existing credential lookup fails', async () => {
      identityGateway.findUserByEmail.mockResolvedValueOnce(
        Result.success(existingSuperAdmin),
      );
      credentialRepository.mockFailedFindByUserId('db down');

      const result = await useCase.execute({
        readOnly: false,
        accounts: DEFAULT_ACCOUNTS,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to read credentials for existing user superadmin@store.local',
      );
    });

    it('should fail when the credential reset cannot be saved', async () => {
      identityGateway.findUserByEmail.mockResolvedValueOnce(
        Result.success(existingSuperAdmin),
      );
      credentialRepository.mockSuccessfulFindByUserId(
        AuthenticationDtoFactory.buildPersistedCredentialEntity({
          id: 40,
          userId: 40,
        }),
      );
      credentialRepository.mockFailedUpdate('write failed');
      passwordHasher.hash.mockResolvedValue('reset-hash');

      const result = await useCase.execute({
        readOnly: false,
        accounts: DEFAULT_ACCOUNTS,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to reset credentials for superadmin@store.local',
      );
    });
  });

  describe('rollback of a partially created user', () => {
    const createdUser = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 50,
      email: 'superadmin@store.local',
    });

    beforeEach(() => {
      identityGateway.mockFindUserByEmail(null);
      identityGateway.createUser.mockResolvedValueOnce(
        Result.success(createdUser),
      );
      passwordHasher.hash.mockResolvedValue('hashed_password');
    });

    it('should report the original error when credential save fails and the user rollback succeeds', async () => {
      credentialRepository.mockFailedSave('save failed');
      identityGateway.mockDeleteUser();

      const result = await useCase.execute({
        readOnly: false,
        accounts: DEFAULT_ACCOUNTS,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to seed credentials for superadmin@store.local',
      );
      expect(identityGateway.deleteUser).toHaveBeenCalledWith(50);
      expect(credentialRepository.deleteByUserId).not.toHaveBeenCalled();
    });

    it('should fail loudly when the user rollback after a credential save failure fails', async () => {
      credentialRepository.mockFailedSave('save failed');
      identityGateway.mockFailedDeleteUser('delete failed');

      const result = await useCase.execute({
        readOnly: false,
        accounts: DEFAULT_ACCOUNTS,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to roll back user superadmin@store.local',
      );
    });

    it('should roll back credential and user when role assignment fails', async () => {
      credentialRepository.save.mockImplementation((credential) =>
        Promise.resolve(Result.success(credential)),
      );
      authorizationGateway.mockFailedAssignRole('role failed');
      credentialRepository.mockSuccessfulDeleteByUserId();
      identityGateway.mockDeleteUser();

      const result = await useCase.execute({
        readOnly: false,
        accounts: DEFAULT_ACCOUNTS,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to assign role for superadmin@store.local',
      );
      expect(credentialRepository.deleteByUserId).toHaveBeenCalledWith(50);
      expect(identityGateway.deleteUser).toHaveBeenCalledWith(50);
    });

    it('should fail loudly and keep the user when the credential rollback fails', async () => {
      credentialRepository.save.mockImplementation((credential) =>
        Promise.resolve(Result.success(credential)),
      );
      authorizationGateway.mockFailedAssignRole('role failed');
      credentialRepository.mockFailedDeleteByUserId('delete failed');

      const result = await useCase.execute({
        readOnly: false,
        accounts: DEFAULT_ACCOUNTS,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to roll back credentials for superadmin@store.local',
      );
      expect(identityGateway.deleteUser).not.toHaveBeenCalled();
    });

    it('should fail loudly when the user rollback after a role failure fails', async () => {
      credentialRepository.save.mockImplementation((credential) =>
        Promise.resolve(Result.success(credential)),
      );
      authorizationGateway.mockFailedAssignRole('role failed');
      credentialRepository.mockSuccessfulDeleteByUserId();
      identityGateway.mockFailedDeleteUser('delete failed');

      const result = await useCase.execute({
        readOnly: false,
        accounts: DEFAULT_ACCOUNTS,
      });

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to roll back user superadmin@store.local',
      );
    });
  });
});
