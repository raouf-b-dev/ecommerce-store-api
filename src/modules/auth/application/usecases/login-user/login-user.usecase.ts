import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { BcryptService } from '../../../infrastructure/services/bcrypt.service';
import { LoginDto } from '../../../presentation/dto/login.dto';

@Injectable()
export class LoginUserUseCase extends UseCase<
  LoginDto,
  { accessToken: string },
  UseCaseError
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly bcryptService: BcryptService,
    private readonly jwtService: JwtService,
  ) {
    super();
  }

  async execute(
    dto: LoginDto,
  ): Promise<Result<{ accessToken: string }, UseCaseError>> {
    try {
      // 1. Find User
      const userResult = await this.userRepository.findByEmail(dto.email);
      if (userResult.isFailure || !userResult.value) {
        return ErrorFactory.UseCaseError('Invalid credentials');
      }
      const user = userResult.value;

      // 2. Verify Password
      const isMatch = await this.bcryptService.compare(
        dto.password,
        user.passwordHash,
      );
      if (!isMatch) {
        return ErrorFactory.UseCaseError('Invalid credentials');
      }

      // 3. Generate Token
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        customerId: user.customerId,
      };
      const accessToken = this.jwtService.sign(payload);

      return Result.success({ accessToken });
    } catch (error) {
      return ErrorFactory.UseCaseError('Unexpected error during login', error);
    }
  }
}
