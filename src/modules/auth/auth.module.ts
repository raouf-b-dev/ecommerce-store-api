import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BcryptService } from './secondary-adapters/services/bcrypt.service';
import { PasswordHasher } from '../../shared-kernel/domain/interfaces/password-hasher.interface';
import { SessionTokenEntity } from './secondary-adapters/orm/session-token.schema';
import { SessionTokenRepository } from './core/domain/repositories/session-token.repository';
import { AuthController } from './auth.controller';
import { LoginUserUseCase } from './core/application/usecases/login-user/login-user.usecase';
import { RegisterUserUseCase } from './core/application/usecases/register-user/register-user.usecase';
import { RefreshTokenUseCase } from './core/application/usecases/refresh-token/refresh-token.usecase';
import { LogoutUseCase } from './core/application/usecases/logout/logout.usecase';
import { LogoutAllUseCase } from './core/application/usecases/logout-all/logout-all.usecase';
import { RefreshTokenCookieInterceptor } from './primary-adapters/interceptors/refresh-token-cookie.interceptor';
import { ACCESS_GATEWAY } from './auth.tokens';
import { ModuleAccessGateway } from './secondary-adapters/adapters/module-access.gateway';
import { JwtSignerPort } from './core/application/ports/jwt-signer.port';
import { JwtSignerService } from './core/application/services/jwt-signer.service';
import { RedisModule } from '../../infrastructure/redis/redis.module';

import { PostgresSessionTokenRepository } from './secondary-adapters/repositories/postgres-session-token-repository/postgres-session-token.repository';
import { AccessModule } from '../access/access.module';
import { IdentityAccessGateway } from './core/application/ports/access.gateway';
import { RevokeAllForUserUsecase } from './core/application/usecases/revoke-all-for-user/revoke-all-for-user.usecase';
import { UserDeactivatedListener } from './primary-adapters/listeners/user-deactivated.listener';
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([SessionTokenEntity]),
    RedisModule,
    AccessModule,
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: PasswordHasher,
      useClass: BcryptService,
    },

    {
      provide: SessionTokenRepository,
      useClass: PostgresSessionTokenRepository,
    },

    // Gateways
    {
      provide: ACCESS_GATEWAY,
      useClass: ModuleAccessGateway,
    },

    // Services
    {
      provide: JwtSignerPort,
      useClass: JwtSignerService,
    },

    {
      provide: IdentityAccessGateway,
      useExisting: ACCESS_GATEWAY,
    },

    // Use Cases
    RegisterUserUseCase,
    LoginUserUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    LogoutAllUseCase,
    RefreshTokenCookieInterceptor,
    RevokeAllForUserUsecase,
    UserDeactivatedListener,
  ],
  exports: [RevokeAllForUserUsecase, PasswordHasher, JwtSignerPort],
})
export class AuthModule {}
