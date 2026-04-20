import { Test, TestingModule } from '@nestjs/testing';
import { JwtSignerService } from './jwt-signer.service';
import { EnvConfigService } from '../../config/env-config.service';

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
      ],
    }).compile();

    service = module.get<JwtSignerService>(JwtSignerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
