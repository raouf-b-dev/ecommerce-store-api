import { Test, TestingModule } from '@nestjs/testing';
import { SeedSuperAdminUseCase } from './seed-super-admin.usecase';
import { PasswordHasher } from '../../../../../shared-kernel/domain/interfaces/password-hasher.interface';
import { IdentityGateway } from '../ports/identity.gateway';
import { AuthorizationGateway } from '../ports/authorization.gateway';
import { CredentialRepository } from '../../domain/repositories/credential.repository';
import {
  IdentityAccessGatewayMock,
  AuthorizationGatewayMock,
  CredentialRepositoryMock,
  MockPasswordHasher,
  IdentityAccessGatewayDtoFactory,
} from 'src/modules/authentication/testing';
import { ResultAssertionHelper } from '../../../../../testing';
import { SystemRoleCode } from '../../../../../shared-kernel/domain/value-objects/system-roles';
import { Credential } from '../../domain/entities/credential';

describe('SeedSuperAdminUseCase', () => {
  let useCase: SeedSuperAdminUseCase;
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
        SeedSuperAdminUseCase,
        { provide: IdentityGateway, useValue: identityGateway },
        { provide: AuthorizationGateway, useValue: authorizationGateway },
        { provide: CredentialRepository, useValue: credentialRepository },
        { provide: PasswordHasher, useValue: passwordHasher },
      ],
    }).compile();

    useCase = module.get<SeedSuperAdminUseCase>(SeedSuperAdminUseCase);
  });

  it('should seed super admin user when they do not exist', async () => {
    identityGateway.mockFindUserByEmail(null);
    const mockUser = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 1,
      email: 'superadmin@example.com',
    });
    identityGateway.mockCreateUser(mockUser);
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
      email: 'superadmin@example.com',
      password: 'strongpassword123',
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      email: 'superadmin@example.com',
      status: 'created',
    });
    expect(identityGateway.findUserByEmail).toHaveBeenCalledWith(
      'superadmin@example.com',
    );
    expect(identityGateway.createUser).toHaveBeenCalledWith({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@example.com',
    });
    expect(passwordHasher.hash).toHaveBeenCalledWith('strongpassword123');
    expect(credentialRepository.save).toHaveBeenCalled();
    expect(authorizationGateway.assignRole).toHaveBeenCalledWith(
      1,
      SystemRoleCode.SUPER_ADMIN,
    );
  });

  it('should skip seeding if super admin already exists', async () => {
    const existingUser = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 1,
      email: 'superadmin@example.com',
    });
    identityGateway.mockFindUserByEmail(existingUser);

    const result = await useCase.execute({
      email: 'superadmin@example.com',
      password: 'strongpassword123',
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value).toEqual({
      email: 'superadmin@example.com',
      status: 'existing',
    });
    expect(identityGateway.findUserByEmail).toHaveBeenCalledWith(
      'superadmin@example.com',
    );
    expect(identityGateway.createUser).not.toHaveBeenCalled();
    expect(credentialRepository.save).not.toHaveBeenCalled();
  });

  it('should reject short passwords', async () => {
    const result = await useCase.execute({
      email: 'superadmin@example.com',
      password: '123',
    });

    ResultAssertionHelper.assertResultFailure(result);
    if (result.isFailure) {
      expect(result.error.message).toBe(
        'Password must be at least 6 characters long.',
      );
    }
  });

  it('should compensate if credential creation fails', async () => {
    identityGateway.mockFindUserByEmail(null);
    const mockUser = IdentityAccessGatewayDtoFactory.buildUserRecord({
      id: 1,
      email: 'superadmin@example.com',
    });
    identityGateway.mockCreateUser(mockUser);
    passwordHasher.hash.mockResolvedValue('hashed_password');
    credentialRepository.mockFailedSave('DB Error');
    identityGateway.mockDeleteUser();

    const result = await useCase.execute({
      email: 'superadmin@example.com',
      password: 'strongpassword123',
    });

    ResultAssertionHelper.assertResultFailure(result);
    expect(identityGateway.deleteUser).toHaveBeenCalledWith(1);
  });
});
