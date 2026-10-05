import { generateKeyPairSync } from 'crypto';
import { decodeJwt } from 'jose';
import { MockJwksService } from 'src/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtSignerService } from './jwt-signer.service';
import { JwksPort } from '../../../../../infrastructure/jwt/ports/jwks.port';
import { EnvConfigService } from '../../../../../config/env-config.service';

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

    service = module.get<JwtSignerService>(JwtSignerService);
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
      const decoded = decodeJwt(result.token);
      expect(decoded.sid).toBe('session-kept');
      if (typeof decoded.exp !== 'number') {
        throw new Error('Expected refresh token exp');
      }
      expect(result.expiresAt.getTime()).toBe(decoded.exp * 1000);
    });

    it('mints a session id when none is provided', async () => {
      const first = await signingService.signRefreshTokenWithSession({
        sub: '1',
      });
      const second = await signingService.signRefreshTokenWithSession({
        sub: '1',
      });

      expect(first.sessionId).not.toBe(second.sessionId);
      expect(decodeJwt(first.token).sid).toBe(first.sessionId);
      expect(decodeJwt(second.token).sid).toBe(second.sessionId);
    });
  });
});
