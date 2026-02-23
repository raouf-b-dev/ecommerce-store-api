import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvConfigService } from 'src/config/env-config.service';
import { EnvConfigModule } from '../../../config/config.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [EnvConfigModule],
      inject: [EnvConfigService],
      useFactory: (envConfigService: EnvConfigService) => {
        const dbConfig = envConfigService.postgres;
        const nodeConfig = envConfigService.node;

        return {
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          autoLoadEntities: true,
          synchronize: nodeConfig.env !== 'production',
          logging: nodeConfig.env !== 'production' ? 'all' : ['error'],
        };
      },
    }),
  ],
})
export class DatabaseModule {}
