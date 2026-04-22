import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgresUserRepository } from './secondary-adapters/repositories/postgres-user-repository/postgres-user.repository';
import { CachedUserRepository } from './secondary-adapters/repositories/cached-user-repository/cached-user.repository';
import { PostgresSessionTokenRepository } from './secondary-adapters/repositories/postgres-session-token-repository/postgres-session-token.repository';
import { BcryptService } from './secondary-adapters/services/bcrypt.service';
import { UserEntity } from './secondary-adapters/orm/user.schema';
import { SessionTokenEntity } from './secondary-adapters/orm/session-token.schema';
import { CustomersModule } from '../customers/customers.module';
import { UserRepository } from './core/domain/repositories/user.repository';
import { SessionTokenRepository } from './core/domain/repositories/session-token.repository';
import { AuthController } from './auth.controller';
import { LoginUserUseCase } from './core/application/usecases/login-user/login-user.usecase';
import { RegisterUserUseCase } from './core/application/usecases/register-user/register-user.usecase';
import { RefreshTokenUseCase } from './core/application/usecases/refresh-token/refresh-token.usecase';
import { LogoutUseCase } from './core/application/usecases/logout/logout.usecase';
import { LogoutAllUseCase } from './core/application/usecases/logout-all/logout-all.usecase';
import {
  POSTGRES_USER_REPOSITORY,
  CACHED_USER_REPOSITORY,
  CUSTOMER_GATEWAY,
} from './auth.tokens';
import { ModuleCustomerGateway } from './secondary-adapters/adapters/module-customer.gateway';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { CacheService } from '../../infrastructure/redis/cache/cache.service';
import { EnvConfigService } from '../../config/env-config.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, SessionTokenEntity]),
    CustomersModule,
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [
    BcryptService,
    {
      provide: POSTGRES_USER_REPOSITORY,
      useClass: PostgresUserRepository,
    },
    {
      provide: CACHED_USER_REPOSITORY,
      useFactory: (
        cacheService: CacheService,
        postgresRepo: PostgresUserRepository,
      ) => {
        return new CachedUserRepository(cacheService, postgresRepo);
      },
      inject: [CacheService, POSTGRES_USER_REPOSITORY],
    },
    {
      provide: UserRepository,
      useExisting: CACHED_USER_REPOSITORY,
    },
    {
      provide: SessionTokenRepository,
      useClass: PostgresSessionTokenRepository,
    },

    // Gateways
    {
      provide: CUSTOMER_GATEWAY,
      useClass: ModuleCustomerGateway,
    },

    // Use Cases
    RegisterUserUseCase,
    LoginUserUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    LogoutAllUseCase,
  ],
  exports: [],
})
export class AuthModule {}
