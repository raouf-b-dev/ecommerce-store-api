import { Injectable } from '@nestjs/common';
import { JwtSignerService } from '../../../../../../infrastructure/jwt/jwt-signer.service';
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
    private readonly jwtSignerService: JwtSignerService,
  ) {
    super();
  }

  async execute(
    dto: LoginDto,
  ): Promise<Result<{ accessToken: string }, UseCaseError>> {
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
    const accessToken = await this.jwtSignerService.signAccessToken(payload);

    return Result.success({ accessToken });
  }
}
