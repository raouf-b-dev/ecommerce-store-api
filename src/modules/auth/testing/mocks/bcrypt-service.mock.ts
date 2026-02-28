import { BcryptService } from '../../secondary-adapters/services/bcrypt.service';

export class MockBcryptService extends BcryptService {
  hash = jest.fn<Promise<string>, [string]>();
  compare = jest.fn<Promise<boolean>, [string, string]>();

  constructor() {
    super();
    this.hash.mockResolvedValue('hashed_password');
    this.compare.mockResolvedValue(true);
  }
}
