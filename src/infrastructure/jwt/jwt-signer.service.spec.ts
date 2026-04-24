import { Test, TestingModule } from '@nestjs/testing';
import { JwtSignerService } from './jwt-signer.service';
import { JwksService } from './jwks.service';
import { EnvConfigService } from '../../config/env-config.service';
import { MockJwksService } from '../../testing/mocks/jwks.service.mock';

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
          provide: JwksService,
          useClass: MockJwksService,
        },
      ],
    }).compile();

    service = module.get<JwtSignerService>(JwtSignerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
