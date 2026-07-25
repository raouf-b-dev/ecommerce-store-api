import { PasswordHasher } from '../../../../shared-kernel/domain/interfaces/password-hasher.interface';

export class MockPasswordHasher implements PasswordHasher {
  hash = jest.fn<Promise<string>, [string]>();
  compare = jest.fn<Promise<boolean>, [string, string]>();

  mockSuccessfulHash(hashedPassword: string) {
    this.hash.mockResolvedValue(hashedPassword);
  }

  mockSuccessfulCompare(result: boolean) {
    this.compare.mockResolvedValue(result);
  }

  reset() {
    this.hash.mockClear();
    this.compare.mockClear();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.hash).not.toHaveBeenCalled();
    expect(this.compare).not.toHaveBeenCalled();
  }
}
