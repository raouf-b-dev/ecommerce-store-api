import { generateKeyPairSync } from 'crypto';
import * as jose from 'jose';
import { ClockTestHelper, MockJwksService } from 'src/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtSignerService } from './jwt-signer.service';
import { JwksPort } from '../../../../infrastructure/jwt/ports/jwks.port';
import { EnvConfigService } from '../../../../config/env-config.service';

function createPrivateKeyPem(): string {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const exported = privateKey.export({ type: 'pkcs8', format: 'pem' });
  if (typeof exported !== 'string') {
    throw new Error('Expected a PEM private key');
  }
  return exported;
}

describe('JwtSignerService', () => {
  let service: JwtSignerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtSignerService,
        {
          provide: EnvConfigService,
          useValue: {
            jwt: {
              privateKey: 'test',
              accessTokenTtl: '15m',
              refreshTokenTtl: '7d',
            },
          },
        },
        {
          provide: JwksPort,
          useClass: MockJwksService,
        },
      ],
    }).compile();

    service = module.get(JwtSignerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signRefreshTokenWithSession', () => {
    let signingService: JwtSignerService;

    beforeAll(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtSignerService,
          {
            provide: EnvConfigService,
            useValue: {
              jwt: {
                privateKey: createPrivateKeyPem(),
                accessTokenTtl: '15m',
                refreshTokenTtl: '7d',
              },
            },
          },
          {
            provide: JwksPort,
            useClass: MockJwksService,
          },
        ],
      }).compile();

      signingService = module.get(JwtSignerService);
    });

    it('embeds the given session id in the refresh token', async () => {
      const result = await signingService.signRefreshTokenWithSession({
        sub: 1,
        sid: 'session-kept',
      });

      expect(result.sessionId).toBe('session-kept');
      const decoded = jose.decodeJwt(result.token);
      expect(decoded.sid).toBe('session-kept');
      if (typeof decoded.exp !== 'number') {
        throw new Error('Expected refresh token exp');
      }
      expect(result.expiresAt.getTime()).toBe(decoded.exp * 1000);
    });

    it('sets expiresAt from the configured refresh TTL when the payload has no exp', async () => {
      const fixed = new Date('2026-06-01T00:00:00.000Z');
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const decodeJwt = jest.spyOn(jose, 'decodeJwt');

      const result = await ClockTestHelper.runWithFixedDate(fixed, () =>
        signingService.signRefreshTokenWithSession({
          sub: 1,
          sid: 'session-kept',
        }),
      );

      expect(decodeJwt).not.toHaveBeenCalled();
      decodeJwt.mockRestore();
      expect(result.expiresAt.getTime()).toBe(fixed.getTime() + sevenDaysMs);
      const decoded = jose.decodeJwt(result.token);
      expect(decoded.exp).toBe(Math.floor(result.expiresAt.getTime() / 1000));
    });

    it('issues a distinct refresh token when the same session is signed twice in one second', async () => {
      const fixed = new Date('2026-06-01T00:00:00.000Z');
      const signed = await ClockTestHelper.runWithFixedDate(fixed, async () => {
        const first = await signingService.signRefreshTokenWithSession({
          sub: 1,
          sid: 'session-kept',
        });
        const second = await signingService.signRefreshTokenWithSession({
          sub: 1,
          sid: 'session-kept',
        });
        return { first, second };
      });

      expect(signed.first.token).not.toBe(signed.second.token);
      expect(signed.first.sessionId).toBe(signed.second.sessionId);
      expect(signed.first.expiresAt.getTime()).toBe(
        signed.second.expiresAt.getTime(),
      );
      expect(jose.decodeJwt(signed.first.token).jti).not.toBe(
        jose.decodeJwt(signed.second.token).jti,
      );
    });

    it('mints a session id when none is provided', async () => {
      const first = await signingService.signRefreshTokenWithSession({
        sub: '1',
      });
      const second = await signingService.signRefreshTokenWithSession({
        sub: '1',
      });

      expect(first.sessionId).not.toBe(second.sessionId);
      expect(jose.decodeJwt(first.token).sid).toBe(first.sessionId);
      expect(jose.decodeJwt(second.token).sid).toBe(second.sessionId);
    });
  });
});
