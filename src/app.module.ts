import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrdersModule } from './modules/orders/orders.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { EnvConfigModule } from './config/config.module';
import { DatabaseModule } from './core/infrastructure/database/database.module';
import { RedisModule } from './core/infrastructure/redis/redis.module';

@Module({
  imports: [
    OrdersModule,
    EnvConfigModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
      load: [configuration],
    }),
    DatabaseModule,
    RedisModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
