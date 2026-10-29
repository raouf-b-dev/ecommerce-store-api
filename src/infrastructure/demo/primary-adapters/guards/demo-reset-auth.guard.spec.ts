import {
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createMockExecutionContext,
  MockEnvConfigService,
} from '../../../../testing';
import {
  DEMO_RESET_TOKEN_HEADER,
  DemoResetAuthGuard,
} from './demo-reset-auth.guard';

const ENABLED_TOKEN = 'x'.repeat(32);

describe('DemoResetAuthGuard', () => {
  let config: MockEnvConfigService;
  let guard: DemoResetAuthGuard;

  beforeEach(() => {
    config = new MockEnvConfigService();
    guard = new DemoResetAuthGuard(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 404 when reset is disabled, even with the token', () => {
    config.setMockConfig({
      demo: {
        resetEnabled: false,
        resetToken: ENABLED_TOKEN,
        readOnly: false,
      },
    });
    const context = createMockExecutionContext({
      headers: { [DEMO_RESET_TOKEN_HEADER]: ENABLED_TOKEN },
    });

    expect(() => guard.canActivate(context)).toThrow(NotFoundException);
  });

  it('returns 401 when the token header is missing', () => {
    config.setMockConfig({
      demo: {
        resetEnabled: true,
        resetToken: ENABLED_TOKEN,
        readOnly: false,
      },
    });
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {
      return undefined;
    });
    const context = createMockExecutionContext({ headers: {} });

    let thrown: unknown;
    try {
      guard.canActivate(context);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(UnauthorizedException);
    expect(thrown).toMatchObject({ message: 'Unauthorized' });
    expect(warn).toHaveBeenCalledWith('demo_reset_rejected');
  });

  it('returns 401 when the token does not match, without logging it', () => {
    config.setMockConfig({
      demo: {
        resetEnabled: true,
        resetToken: ENABLED_TOKEN,
        readOnly: false,
      },
    });
    const provided = 'y'.repeat(32);
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {
      return undefined;
    });
    const context = createMockExecutionContext({
      headers: { [DEMO_RESET_TOKEN_HEADER]: provided },
    });

    let thrown: unknown;
    try {
      guard.canActivate(context);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(UnauthorizedException);
    expect(thrown).toMatchObject({ message: 'Unauthorized' });
    expect(warn.mock.calls.flat().join(' ')).not.toContain(provided);
    expect(warn.mock.calls.flat().join(' ')).not.toContain(ENABLED_TOKEN);
  });

  it('allows the request when the token matches', () => {
    config.setMockConfig({
      demo: {
        resetEnabled: true,
        resetToken: ENABLED_TOKEN,
        readOnly: false,
      },
    });
    const context = createMockExecutionContext({
      headers: { [DEMO_RESET_TOKEN_HEADER]: ENABLED_TOKEN },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a token whose length differs from the expected secret', () => {
    config.setMockConfig({
      demo: {
        resetEnabled: true,
        resetToken: ENABLED_TOKEN,
        readOnly: false,
      },
    });
    const context = createMockExecutionContext({
      headers: { [DEMO_RESET_TOKEN_HEADER]: 'short' },
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
