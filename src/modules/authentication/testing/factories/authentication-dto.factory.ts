import { LoginCommand } from '../../core/application/commands/login.command';
import { RegisterCommand } from '../../core/application/commands/register.command';
import {
  Credential,
  CredentialProps,
} from '../../core/domain/entities/credential';
import { SessionToken } from '../../core/domain/entities/session-token';
import { ICredential } from '../../core/domain/interfaces/credential.interface';

export class AuthenticationDtoFactory {
  static createLoginCommand(overrides?: Partial<LoginCommand>): LoginCommand {
    const baseCommand: LoginCommand = {
      email: 'test@example.com',
      password: 'password',
    };

    return { ...baseCommand, ...overrides };
  }

  static createInvalidLoginCommand(): LoginCommand {
    return {
      email: '',
      password: '',
    };
  }

  static createRegisterCommand(
    overrides?: Partial<RegisterCommand>,
  ): RegisterCommand {
    const baseCommand: RegisterCommand = {
      email: 'test@example.com',
      password: 'password',
      firstName: 'John',
      lastName: 'Doe',
      phone: 'phone',
    };

    return { ...baseCommand, ...overrides };
  }

  static createInvalidRegisterCommand(): RegisterCommand {
    return {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
    };
  }

  static buildCredentialEntity(
    overrides?: Partial<CredentialProps>,
  ): Credential {
    const baseCredential: CredentialProps = {
      id: 1,
      userId: 1,
      passwordHash: 'passwordHash',
      mustChangePassword: true,
    };

    return Credential.create({ ...baseCredential, ...overrides });
  }

  static buildPersistedCredentialEntity(
    overrides?: Partial<CredentialProps & { id: number }>,
  ): Credential {
    const baseCredential = {
      id: 1,
      userId: 1,
      passwordHash: 'passwordHash',
      mustChangePassword: true,
    };

    return Credential.fromPersistence({ ...baseCredential, ...overrides });
  }

  static buildSessionToken(
    overrides?: Partial<{
      userId: number;
      rawToken: string;
      expiresAt: Date;
      id: string;
    }>,
  ): SessionToken {
    const userId = overrides?.userId ?? 1;
    const rawToken = overrides?.rawToken ?? 'refresh-token';
    const expiresAt = overrides?.expiresAt ?? new Date(Date.now() + 3600_000);
    const id = overrides?.id ?? 'session-id';

    return SessionToken.create(userId, rawToken, expiresAt, id);
  }

  static buildCredentialPremitives(
    overrides?: Partial<ICredential>,
  ): ICredential {
    const baseCredential: ICredential = {
      id: 1,
      userId: 1,
      passwordHash: 'passwordHash',
      mustChangePassword: true,
    };

    return { ...baseCredential, ...overrides };
  }
}
