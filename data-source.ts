// data-source.ts
import { existsSync } from 'fs';
import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import configuration from './src/config/configuration';
import { join } from 'path';

const nodeEnv = process.env.NODE_ENV || 'development';
const envPath = `.env.${nodeEnv}`;

if (existsSync(envPath)) {
  console.log(`🔑 Loading environment from ${envPath}`);
  loadEnv({ path: envPath });
} else {
  console.log(`🔑 No env file at ${envPath}; using process.env (${nodeEnv})`);
}

const config = configuration();
const dbConfig = config.postgres;
const appEnv = config.node?.env ?? nodeEnv;

const options: DataSourceOptions = {
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  synchronize: false,
  logging: appEnv !== 'production' ? 'all' : ['error'],
  entities: [__dirname + '/**/*.schema.{ts,js}'],
  migrations: [join(__dirname, 'src/migrations/*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
};

export const AppDataSource = new DataSource(options);
