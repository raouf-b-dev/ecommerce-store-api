import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PostgresUserRepository } from './secondary-adapters/repositories/postgres-user-repository/postgres-user.repository';
import { RedisUserRepository } from './secondary-adapters/repositories/redis-user-repository/redis-user.repository';
import { BcryptService } from './secondary-adapters/services/bcrypt.service';
import { JwtStrategy } from './secondary-adapters/strategies/jwt.strategy';
import { UserEntity } from './secondary-adapters/orm/user.schema';
import { CustomersModule } from '../customers/customers.module';
import { UserRepository } from './core/domain/repositories/user.repository';
import { AuthController } from './auth.controller';
import { LoginUserUseCase } from './core/application/usecases/login-user/login-user.usecase';
import { RegisterUserUseCase } from './core/application/usecases/register-user/register-user.usecase';
import { POSTGRES_USER_REPOSITORY, REDIS_USER_REPOSITORY } from './auth.tokens';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { CacheService } from '../../infrastructure/redis/cache/cache.service';
import { EnvConfigService } from '../../config/env-config.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (envConfigService: EnvConfigService) => ({
        secret: envConfigService.jwt.secret,
        signOptions: { expiresIn: envConfigService.jwt.expiresIn },
      }),
      inject: [EnvConfigService],
    }),
    CustomersModule,
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [
    BcryptService,
    JwtStrategy,
    {
      provide: POSTGRES_USER_REPOSITORY,
      useClass: PostgresUserRepository,
    },
    {
      provide: REDIS_USER_REPOSITORY,
      useFactory: (
        cacheService: CacheService,
        postgresRepo: PostgresUserRepository,
      ) => {
        return new RedisUserRepository(cacheService, postgresRepo);
      },
      inject: [CacheService, POSTGRES_USER_REPOSITORY],
    },
    {
      provide: UserRepository,
      useExisting: REDIS_USER_REPOSITORY,
    },

    // Use Cases
    RegisterUserUseCase,
    LoginUserUseCase,
  ],
  exports: [JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
