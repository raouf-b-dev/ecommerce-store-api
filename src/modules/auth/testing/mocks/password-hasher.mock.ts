import { PasswordHasher } from '../../../../shared-kernel/domain/interfaces/password-hasher.interface';

export class MockPasswordHasher extends PasswordHasher {
  hash = jest.fn<Promise<string>, [string]>();
  compare = jest.fn<Promise<boolean>, [string, string]>();

  constructor() {
    super();
    this.hash.mockResolvedValue('hashed_password');
    this.compare.mockResolvedValue(true);
  }
}
