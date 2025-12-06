import { JWTAuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  it('should be defined', () => {
    expect(new JWTAuthGuard()).toBeDefined();
  });

  it('should have canActivate method', () => {
    const guard = new JWTAuthGuard();
    expect(guard.canActivate).toBeDefined();
  });
});
