import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EnvConfigService } from '../../config/env-config.service';
import { importPKCS8, importJWK, exportJWK, JWK } from 'jose';

@Injectable()
export class JwksService implements OnModuleInit {
  private readonly logger = new Logger(JwksService.name);
  private publicKey!: CryptoKey;
  private jwks!: { keys: JWK[] };

  constructor(private readonly configService: EnvConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      const pem = this.configService.jwt.privateKey;

      // Import the PEM-formatted private key as extractable
      // so we can derive the public JWK from it
      const privateKey = await importPKCS8(pem, 'RS256', {
        extractable: true,
      });

      // Export the full JWK and strip private parameters to derive the public key
      const fullJwk = await exportJWK(privateKey);
      const { d, p, q, dp, dq, qi, ...publicJwk } = fullJwk;

      const jwk: JWK = {
        ...publicJwk,
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        kid: '1',
      };

      // Re-import the public JWK into a CryptoKey for runtime verification
      this.publicKey = (await importJWK(jwk, 'RS256')) as CryptoKey;
      this.jwks = { keys: [jwk] };

      this.logger.log('RSA JWT keys imported and JWKS generated successfully.');
    } catch (error: unknown) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        'Failed to initialize JWT keys. Ensure JWT_PRIVATE_KEY is a valid RSA PEM string.',
        stack,
      );
      throw error;
    }
  }

  getPublicKey(): CryptoKey {
    return this.publicKey;
  }

  getJwks(): { keys: JWK[] } {
    return this.jwks;
  }
}
