import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'socket.io';
import { JwtVerifierPort } from '../../../shared-kernel/domain/interfaces/jwt-verifier.port';
import { MockJwtVerifierService } from '../../jwt/testing/jwt-verifier.mock';
import { WsAuthService } from './ws-auth.service';

function mockClient(handshake: {
  auth?: { token?: unknown };
  headers?: { authorization?: string };
  query?: { token?: string | string[] };
}): Socket {
  return {
    id: 'socket-1',
    handshake: {
      auth: handshake.auth ?? {},
      headers: handshake.headers ?? {},
      query: handshake.query ?? {},
    },
  } as Socket;
}

describe('WsAuthService', () => {
  let service: WsAuthService;
  let jwtVerifier: MockJwtVerifierService;

  beforeEach(async () => {
    jwtVerifier = new MockJwtVerifierService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsAuthService,
        { provide: JwtVerifierPort, useValue: jwtVerifier },
      ],
    }).compile();

    service = module.get(WsAuthService);
  });

  it('reads Socket.IO handshake auth.token', async () => {
    await service.authenticate(mockClient({ auth: { token: 'auth-jwt' } }));

    expect(jwtVerifier.verifyAccessToken).toHaveBeenCalledWith('auth-jwt');
  });

  it('prefers auth.token over query.token so the JWT is not taken from the URL', async () => {
    await service.authenticate(
      mockClient({
        auth: { token: 'auth-jwt' },
        query: { token: 'query-jwt' },
      }),
    );

    expect(jwtVerifier.verifyAccessToken).toHaveBeenCalledWith('auth-jwt');
  });

  it('falls back to Authorization Bearer for non-browser clients', async () => {
    await service.authenticate(
      mockClient({
        headers: { authorization: 'Bearer header-jwt' },
      }),
    );

    expect(jwtVerifier.verifyAccessToken).toHaveBeenCalledWith('header-jwt');
  });

  it('falls back to query.token for legacy clients', async () => {
    await service.authenticate(mockClient({ query: { token: 'query-jwt' } }));

    expect(jwtVerifier.verifyAccessToken).toHaveBeenCalledWith('query-jwt');
  });

  it('reads the first query.token when Socket.IO repeats the param', async () => {
    await service.authenticate(
      mockClient({ query: { token: ['query-jwt', 'ignored'] } }),
    );

    expect(jwtVerifier.verifyAccessToken).toHaveBeenCalledWith('query-jwt');
  });

  it('rejects connections with no token', async () => {
    await expect(service.authenticate(mockClient({}))).rejects.toThrow(
      'Missing token',
    );
    expect(jwtVerifier.verifyAccessToken).not.toHaveBeenCalled();
  });
});
