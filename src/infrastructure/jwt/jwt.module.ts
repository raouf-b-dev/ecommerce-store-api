import { Global, Module } from '@nestjs/common';
import { JwksService } from './jwks.service';
import { JwtSignerService } from './jwt-signer.service';
import { JwtVerifierService } from './jwt-verifier.service';

@Global()
@Module({
  providers: [JwksService, JwtSignerService, JwtVerifierService],
  exports: [JwksService, JwtSignerService, JwtVerifierService],
})
export class JwtModule {}
