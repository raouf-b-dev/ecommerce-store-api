import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EnvConfigService } from '../../config/env-config.service';
import { importPKCS8, exportSPKI, exportJWK, JWK } from 'jose';

@Injectable()
export class JwksService implements OnModuleInit {
  private readonly logger = new Logger(JwksService.name);
  private publicKey!: any;
  private jwk!: JWK;

  constructor(private readonly configService: EnvConfigService) {}

  async onModuleInit() {
    try {
      const pem = this.configService.jwt.privateKey;

      // Import the PEM-formatted private key
      const privateKey = await importPKCS8(pem, 'RS256');

      // Derive the public key in SPKI format, then import it
      const spkiPem = await exportSPKI(privateKey);
      this.publicKey = await importPKCS8(spkiPem, 'RS256');

      // Export to JWK for the well-known endpoint
      this.jwk = await exportJWK(this.publicKey);
      // Determine conventionally required properties
      this.jwk = {
        ...this.jwk,
        use: 'sig',
        alg: 'RS256',
        kid: '1', // Hardcoded kid since we don't have rotation yet
      };

      this.logger.log('RSA JWT keys imported and JWKS generated successfully.');
    } catch (error: any) {
      this.logger.error(
        'Failed to initialize JWT keys. Ensure JWT_PRIVATE_KEY is a valid RSA PEM string.',
        error.stack,
      );
      throw error;
    }
  }

  getPublicKey(): any {
    return this.publicKey;
  }

  getJwks() {
    return { keys: [this.jwk] };
  }
}
