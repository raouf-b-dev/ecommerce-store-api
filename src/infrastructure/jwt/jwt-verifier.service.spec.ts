import { Test, TestingModule } from '@nestjs/testing';
import { JwtVerifierService } from './jwt-verifier.service';
import { JwksService } from './jwks.service';

describe('JwtVerifierService', () => {
  let service: JwtVerifierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtVerifierService,
        {
          provide: JwksService,
          useValue: { getPublicKey: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<JwtVerifierService>(JwtVerifierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
