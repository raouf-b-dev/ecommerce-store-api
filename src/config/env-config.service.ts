import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigKey, IAppConfig } from './configuration';

@Injectable()
export class EnvConfigService {
  constructor(private readonly configService: ConfigService) {}

  get<T extends AppConfigKey>(key: T): IAppConfig[T] {
    const value = this.configService.get<IAppConfig[T]>(key);
    if (value === undefined || value === null) {
      throw new Error(`${key} is not defined or invalid`);
    }
    return value;
  }

  get node() {
    return this.get('node');
  }

  get redis() {
    return this.get('redis');
  }

  get jwt() {
    return this.get('jwt');
  }
}
