import { Global, Module } from '@nestjs/common';
import { JwksService } from './services/jwks.service';
import { JwtVerifierService } from './services/jwt-verifier.service';
import { JwtVerifierPort } from './ports/jwt-verifier.port';
import { JwksPort } from './ports/jwks.port';

@Global()
@Module({
  providers: [
    {
      provide: JwksPort,
      useClass: JwksService,
    },
    {
      provide: JwtVerifierPort,
      useClass: JwtVerifierService,
    },
  ],
  exports: [JwksPort, JwtVerifierPort],
})
export class JwtModule {}
