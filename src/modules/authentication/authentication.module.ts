import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BcryptService } from './secondary-adapters/services/bcrypt.service';
import { PasswordHasher } from '../../shared-kernel/domain/interfaces/password-hasher.interface';
import { SessionTokenEntity } from './secondary-adapters/orm/session-token.schema';
import { SessionTokenRepository } from './core/domain/repositories/session-token.repository';
import { AuthenticationController } from './authentication.controller';
import { LoginUserUseCase } from './core/application/usecases/login-user/login-user.usecase';
import { RegisterUserUseCase } from './core/application/usecases/register-user/register-user.usecase';
import { RefreshTokenUseCase } from './core/application/usecases/refresh-token/refresh-token.usecase';
import { LogoutUseCase } from './core/application/usecases/logout/logout.usecase';
import { LogoutAllUseCase } from './core/application/usecases/logout-all/logout-all.usecase';
import { RefreshTokenCookieInterceptor } from './primary-adapters/interceptors/refresh-token-cookie.interceptor';
import {
  AUTHORIZATION_GATEWAY,
  IDENTITY_GATEWAY,
} from './authentication.tokens';
import { ModuleIdentityGateway } from './secondary-adapters/adapters/module-identity.gateway';
import { JwtSignerPort } from './core/application/ports/jwt-signer.port';
import { JwtSignerService } from './core/application/services/jwt-signer.service';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { PostgresSessionTokenRepository } from './secondary-adapters/repositories/postgres-session-token-repository/postgres-session-token.repository';
import { IdentityModule } from '../identity/identity.module';
import { RevokeAllForUserUsecase } from './core/application/usecases/revoke-all-for-user/revoke-all-for-user.usecase';
import { UserDeactivatedListener } from './primary-adapters/listeners/user-deactivated.listener';
import { CredentialRepository } from './core/domain/repositories/credential.repository';
import { PostgresCredentialRepository } from './secondary-adapters/repositories/postgres-credential.repository/postgres-credential.repository';
import { CredentialEntity } from './secondary-adapters/orm/credential.schema';
import { IdentityGateway } from './core/application/ports/identity.gateway';
import { ModuleAuthorizationGateway } from './secondary-adapters/adapters/module-authorization.gateway';
import { AuthorizationGateway } from './core/application/ports/authorization.gateway';
import { SeedDemoAuthUsersUseCase } from './core/application/seed/seed-demo-auth-users.usecase';
import { SeedSuperAdminUseCase } from './core/application/seed/seed-super-admin.usecase';
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([SessionTokenEntity, CredentialEntity]),
    RedisModule,
    IdentityModule,
  ],
  controllers: [AuthenticationController],
  providers: [
    {
      provide: PasswordHasher,
      useClass: BcryptService,
    },

    {
      provide: SessionTokenRepository,
      useClass: PostgresSessionTokenRepository,
    },

    { provide: CredentialRepository, useClass: PostgresCredentialRepository },

    // Gateways
    {
      provide: IDENTITY_GATEWAY,
      useClass: ModuleIdentityGateway,
    },
    {
      provide: IdentityGateway,
      useExisting: IDENTITY_GATEWAY,
    },
    {
      provide: AUTHORIZATION_GATEWAY,
      useClass: ModuleAuthorizationGateway,
    },
    {
      provide: AuthorizationGateway,
      useExisting: AUTHORIZATION_GATEWAY,
    },

    // Services
    {
      provide: JwtSignerPort,
      useClass: JwtSignerService,
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
    SeedDemoAuthUsersUseCase,
    SeedSuperAdminUseCase,
  ],
  exports: [
    RevokeAllForUserUsecase,
    PasswordHasher,
    JwtSignerPort,
    SeedDemoAuthUsersUseCase,
    SeedSuperAdminUseCase,
  ],
})
export class AuthenticationModule {}
