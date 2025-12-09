import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PostgresUserRepository } from './infrastructure/repositories/postgres-user-repository/postgres-user.repository';
import { RedisUserRepository } from './infrastructure/repositories/redis-user-repository/redis-user.repository';
import { BcryptService } from './infrastructure/services/bcrypt.service';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { UserEntity } from './infrastructure/orm/user.schema';
import { CustomersModule } from '../customers/customers.module';
import { UserRepository } from './domain/repositories/user.repository';
import { AuthController } from './auth.controller';
import { LoginUserUseCase } from './application/usecases/login-user/login-user.usecase';
import { RegisterUserUseCase } from './application/usecases/register-user/register-user.usecase';
import { POSTGRES_USER_REPOSITORY, REDIS_USER_REPOSITORY } from './auth.tokens';
import { RedisModule } from '../../core/infrastructure/redis/redis.module';
import { CacheService } from '../../core/infrastructure/redis/cache/cache.service';
import { RegisterUserController } from './presentation/controllers/register-user/register-user.controller';
import { LoginUserController } from './presentation/controllers/login-user/login-user.controller';
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
    RegisterUserUseCase,
    LoginUserUseCase,
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

    // usecases

    RegisterUserUseCase,
    LoginUserUseCase,

    // controllers

    RegisterUserController,
    LoginUserController,
  ],
  exports: [JwtStrategy, PassportModule],
})
export class AuthModule {}
