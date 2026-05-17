import { RegisterCommand } from '../../core/application/usecases/register-user/register-user.usecase';

export class RegisterCommandTestFactory {
  static createRegisterCommand(
    overrides?: Partial<RegisterCommand>,
  ): RegisterCommand {
    const baseCommand: RegisterCommand = {
      email: 'test@example.com',
      password: 'password',
      firstName: 'John',
      lastName: 'Doe',
    };

    return { ...baseCommand, ...overrides };
  }

  static createInvalidRegisterCommand(): RegisterCommand {
    return {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
    };
  }
}
