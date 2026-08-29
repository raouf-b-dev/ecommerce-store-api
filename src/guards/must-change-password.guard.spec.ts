import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MustChangePasswordGuard } from './must-change-password.guard';
import { CredentialRepository } from '../modules/authentication/core/domain/repositories/credential.repository';
import {
  AuthenticationDtoFactory,
  CredentialRepositoryMock,
} from '../modules/authentication/testing';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { ALLOW_DURING_PASSWORD_CHANGE_KEY } from './decorators/allow-during-password-change.decorator';
import {
  createMockExecutionContext,
  createMockRequest,
  MockReflector,
} from '../testing';

describe('MustChangePasswordGuard', () => {
  let guard: MustChangePasswordGuard;
  let reflector: MockReflector;
  let credentialRepository: CredentialRepositoryMock;

  beforeEach(async () => {
    reflector = new MockReflector();
    credentialRepository = new CredentialRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MustChangePasswordGuard,
        { provide: Reflector, useValue: reflector },
        { provide: CredentialRepository, useValue: credentialRepository },
      ],
    }).compile();

    guard = module.get(MustChangePasswordGuard);
    reflector.getAllAndOverride.mockReturnValue(false);
  });

  it('allows public routes without checking credential', async () => {
    reflector.getAllAndOverride.mockImplementation(
      (key) => key === IS_PUBLIC_KEY,
    );

    const allowed = await guard.canActivate(createMockExecutionContext());
    expect(allowed).toBe(true);
    expect(credentialRepository.findByUserId).not.toHaveBeenCalled();
  });

  it('allows routes marked AllowDuringPasswordChange', async () => {
    reflector.getAllAndOverride.mockImplementation(
      (key) => key === ALLOW_DURING_PASSWORD_CHANGE_KEY,
    );

    const request = createMockRequest({
      user: { userId: 1, email: 'a@b.com', role: 'ADMIN' },
    });

    const allowed = await guard.canActivate(
      createMockExecutionContext(request),
    );
    expect(allowed).toBe(true);
    expect(credentialRepository.findByUserId).not.toHaveBeenCalled();
  });

  it('blocks domain routes when credential lookup fails and the claim is set', async () => {
    credentialRepository.mockFailedFindByUserId('DB unavailable');

    const request = createMockRequest({
      user: {
        userId: 1,
        email: 'a@b.com',
        role: 'ADMIN',
        mustChangePassword: true,
      },
    });

    await expect(
      guard.canActivate(createMockExecutionContext(request)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks domain routes when credential is missing and the claim is set', async () => {
    credentialRepository.mockSuccessfulFindByUserId(null);

    const request = createMockRequest({
      user: {
        userId: 1,
        email: 'a@b.com',
        role: 'ADMIN',
        mustChangePassword: true,
      },
    });

    await expect(
      guard.canActivate(createMockExecutionContext(request)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks domain routes when the claim is set and the credential confirms it', async () => {
    credentialRepository.mockSuccessfulFindByUserId(
      AuthenticationDtoFactory.buildCredentialEntity({
        mustChangePassword: true,
      }),
    );

    const request = createMockRequest({
      user: {
        userId: 1,
        email: 'a@b.com',
        role: 'ADMIN',
        mustChangePassword: true,
      },
    });

    await expect(
      guard.canActivate(createMockExecutionContext(request)),
    ).rejects.toThrow(ForbiddenException);
    expect(credentialRepository.findByUserId).toHaveBeenCalledWith(1);
  });

  it('allows domain routes without a credential lookup when the claim is absent', async () => {
    const request = createMockRequest({
      user: { userId: 1, email: 'a@b.com', role: 'ADMIN' },
    });

    await expect(
      guard.canActivate(createMockExecutionContext(request)),
    ).resolves.toBe(true);
    expect(credentialRepository.findByUserId).not.toHaveBeenCalled();
  });

  it('allows a stale claim once the credential has been rotated', async () => {
    credentialRepository.mockSuccessfulFindByUserId(
      AuthenticationDtoFactory.buildCredentialEntity({
        mustChangePassword: false,
      }),
    );

    const request = createMockRequest({
      user: {
        userId: 1,
        email: 'a@b.com',
        role: 'ADMIN',
        mustChangePassword: true,
      },
    });

    await expect(
      guard.canActivate(createMockExecutionContext(request)),
    ).resolves.toBe(true);
  });

  it('looks the credential up by userId rather than sub', async () => {
    credentialRepository.mockSuccessfulFindByUserId(
      AuthenticationDtoFactory.buildCredentialEntity({
        userId: 42,
        mustChangePassword: true,
      }),
    );

    const request = createMockRequest({
      user: {
        userId: 42,
        email: 'a@b.com',
        role: 'ADMIN',
        mustChangePassword: true,
      },
    });

    await expect(
      guard.canActivate(createMockExecutionContext(request)),
    ).rejects.toThrow(ForbiddenException);
    expect(credentialRepository.findByUserId).toHaveBeenCalledWith(42);
  });
});
