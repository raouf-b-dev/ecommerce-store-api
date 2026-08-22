import { existsSync } from 'fs';

export function resolveEnvFilePath(
  nodeEnv = process.env.NODE_ENV ?? 'development',
): string | undefined {
  switch (nodeEnv) {
    case 'development':
      return existsSync('.env.development') ? '.env.development' : undefined;
    case 'production':
      return existsSync('.env.production') ? '.env.production' : undefined;
    case 'staging':
      return existsSync('.env.staging') ? '.env.staging' : undefined;
    case 'test':
      return existsSync('.env.test') ? '.env.test' : undefined;
    default:
      return undefined;
  }
}
