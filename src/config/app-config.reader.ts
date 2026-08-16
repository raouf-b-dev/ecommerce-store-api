import { AppConfigKey, IAppConfig } from './configuration';

export interface AppConfigReader {
  get<T extends AppConfigKey>(key: T): IAppConfig[T] | undefined;
}
