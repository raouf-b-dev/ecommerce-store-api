import { JWK } from 'jose';

export abstract class JwksPort {
  abstract getPublicKey(): CryptoKey;
  abstract getJwks(): { keys: JWK[] };
  abstract getKid(): string;
}
