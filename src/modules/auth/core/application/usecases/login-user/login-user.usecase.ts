import { Injectable } from '@nestjs/common';
import { JwtSignerService } from '../../../../../../infrastructure/jwt/jwt-signer.service';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { SessionTokenRepository } from '../../../domain/repositories/session-token.repository';
import { SessionToken } from '../../../domain/entities/session-token';
import { BcryptService } from '../../../../secondary-adapters/services/bcrypt.service';
import { LoginDto } from '../../../../primary-adapters/dto/login.dto';

@Injectable()
export class LoginUserUseCase extends UseCase<
  LoginDto,
  { accessToken: string; refreshToken: string },
  UseCaseError
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionTokenRepository: SessionTokenRepository,
    private readonly bcryptService: BcryptService,
    private readonly jwtSignerService: JwtSignerService,
  ) {
    super();
  }

  async execute(
    dto: LoginDto,
  ): Promise<
    Result<{ accessToken: string; refreshToken: string }, UseCaseError>
  > {
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

    // 3. Generate Access Token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customerId,
    };
    const accessToken = await this.jwtSignerService.signAccessToken(payload);

    // 4. Generate Refresh Token (JwtSignerService handles sessionId generation and expiry extraction)
    const {
      token: refreshToken,
      sessionId,
      expiresAt,
    } = await this.jwtSignerService.signRefreshTokenWithSession({
      sub: user.id,
    });

    // 5. Save Session
    const session = SessionToken.create(
      user.id as number,
      refreshToken,
      expiresAt,
      sessionId,
    );

    const saveResult = await this.sessionTokenRepository.save(session);
    if (saveResult.isFailure) {
      return ErrorFactory.UseCaseError('Failed to create session');
    }

    return Result.success({ accessToken, refreshToken });
  }
}
