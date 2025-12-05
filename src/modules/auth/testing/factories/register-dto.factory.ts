import { RegisterDto } from '../../presentation/dto/register.dto';

export class RegisterDtoTestFactory {
  static createRegisterDto(overrides?: Partial<RegisterDto>): RegisterDto {
    const baseUser: RegisterDto = {
      email: 'test@example.com',
      password: 'password',
      firstName: 'John',
      lastName: 'Doe',
    };

    return { ...baseUser, ...overrides };
  }

  static createInvalidRegisterDto(): RegisterDto {
    return {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
    };
  }
}
