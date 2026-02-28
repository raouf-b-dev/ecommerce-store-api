import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { BcryptService } from '../../../../secondary-adapters/services/bcrypt.service';
import { LoginDto } from '../../../../primary-adapters/dto/login.dto';

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
