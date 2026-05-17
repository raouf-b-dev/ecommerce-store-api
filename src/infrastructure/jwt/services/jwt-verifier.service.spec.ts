import { Test, TestingModule } from '@nestjs/testing';
import { JwtVerifierService } from './jwt-verifier.service';
import { JwksPort } from '../ports/jwks.port';

describe('JwtVerifierService', () => {
  let service: JwtVerifierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtVerifierService,
        {
          provide: JwksPort,
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
