import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EnvConfigService } from '../../config/env-config.service';
import {
  importPKCS8,
  importJWK,
  exportJWK,
  calculateJwkThumbprint,
  JWK,
} from 'jose';

@Injectable()
export class JwksService implements OnModuleInit {
  private readonly logger = new Logger(JwksService.name);
  private publicKey!: CryptoKey;
  private jwks!: { keys: JWK[] };
  private kid!: string;

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

      // Compute RFC 7638 thumbprint as the kid
      // This creates a deterministic, collision-resistant key identifier
      // derived from the public key material (e, kty, n for RSA)
      this.kid = await calculateJwkThumbprint(
        { ...publicJwk, kty: 'RSA' },
        'sha256',
      );

      const jwk: JWK = {
        ...publicJwk,
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        kid: this.kid,
      };

      // Re-import the public JWK into a CryptoKey for runtime verification
      this.publicKey = (await importJWK(jwk, 'RS256')) as CryptoKey;
      this.jwks = { keys: [jwk] };

      this.logger.log(
        `RSA JWT keys imported and JWKS generated successfully. kid=${this.kid}`,
      );
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

  getKid(): string {
    return this.kid;
  }
}
