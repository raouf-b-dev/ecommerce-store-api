import { LoginCommand } from '../../core/application/usecases/login-user/login-user.usecase';

export class LoginCommandTestFactory {
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
}
