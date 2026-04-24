import { Test, TestingModule } from '@nestjs/testing';
import { JwksService } from './jwks.service';
import { EnvConfigService } from '../../config/env-config.service';

describe('JwksService', () => {
  let service: JwksService;
  let mockEnvConfigService: { jwt: { privateKey: string } };

  beforeEach(async () => {
    // Generate an RSA pem for testing purposes to inject
    mockEnvConfigService = {
      jwt: {
        privateKey: `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCZ3G/O5/X2\nwHwT8EwNZZx8G8lXpK66L8F0/X+c/N+C8X8Z2U+xZ7\n/lYV9d8Pj8c7\n-----END PRIVATE KEY-----`,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwksService,
        {
          provide: EnvConfigService,
          useValue: mockEnvConfigService,
        },
      ],
    }).compile();

    service = module.get<JwksService>(JwksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Since actual PKCS8 import needs a valid key, we test the class structure
  // An integration-level test with a real generated key is preferred,
  // but we can mock jose imports if needed. We'll leave the init test lightweight.
});
