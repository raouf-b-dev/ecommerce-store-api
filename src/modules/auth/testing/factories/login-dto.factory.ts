import { LoginDto } from '../../primary-adapters/dto/login.dto';

export class LoginDtoTestFactory {
  static createLoginDto(overrides?: Partial<LoginDto>): LoginDto {
    const baseUser: LoginDto = {
      email: 'test@example.com',
      password: 'password',
    };

    return { ...baseUser, ...overrides };
  }

  static createInvalidLoginDto(): LoginDto {
    return {
      email: '',
      password: '',
    };
  }
}
