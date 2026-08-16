/**
 * Full-app authentication lifecycle.
 *
 * Prerequisites: PostgreSQL + Redis running (`npm run d:up:dev`) and migrations applied.
 */
import { HttpStatus, INestApplication } from '@nestjs/common';
import {
  AuthSession,
  AuthTestHelper,
  E2E_API_PREFIX,
} from 'src/testing/helpers/auth-test.helper';
import {
  E2eHttpClient,
  E2eTestAppHelper,
} from 'src/testing/helpers/e2e-test-app.helper';
import { HttpErrorAssertionHelper } from 'src/testing/helpers/http-error-assertion.helper';

function setCookieHeaders(response: {
  headers: Record<string, unknown>;
}): string[] {
  const raw = response.headers['set-cookie'];
  if (Array.isArray(raw)) {
    return raw.map(String);
  }
  if (typeof raw === 'string') {
    return [raw];
  }
  return [];
}

describe('Authentication lifecycle (e2e)', () => {
  let app: INestApplication;
  let http: E2eHttpClient;
  let session: AuthSession;

  beforeAll(async () => {
    const context = await E2eTestAppHelper.createApp();
    app = context.app;
    http = E2eTestAppHelper.getHttp(app);
    session = await AuthTestHelper.registerAndLogin(http, {
      firstName: 'Lifecycle',
      lastName: 'Tester',
    });
  }, 120_000);

  afterAll(async () => {
    await E2eTestAppHelper.closeApp(app);
  });

  it('uses the access token on an authenticated route', async () => {
    const response = await http
      .get(`${E2E_API_PREFIX}/users/${session.userId}`)
      .set(AuthTestHelper.bearer(session.accessToken));

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body.id).toBe(session.userId);
    expect(response.body.email).toBe(session.email);
  });

  it('sets HttpOnly refresh cookie on the versioned authentication path', async () => {
    const cookieHttp = E2eTestAppHelper.getHttp(app);
    const cookieUser = await AuthTestHelper.registerAndLogin(cookieHttp, {
      firstName: 'Cookie',
      lastName: 'Path',
    });
    const loginResponse = await cookieHttp
      .post(`${E2E_API_PREFIX}/authentication/login`)
      .send({ email: cookieUser.email, password: cookieUser.password });

    expect(loginResponse.status).toBe(HttpStatus.OK);
    const refreshCookie = setCookieHeaders(loginResponse).find((cookie) =>
      cookie.startsWith('refresh_token='),
    );
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/Path=\/v1\/authentication/i);
    expect(refreshCookie).toMatch(/HttpOnly/i);

    const cookiePair = refreshCookie!.split(';')[0];
    const refreshResponse = await cookieHttp
      .post(`${E2E_API_PREFIX}/authentication/refresh`)
      .set('Cookie', cookiePair)
      .send({});

    expect(refreshResponse.status).toBe(HttpStatus.OK);
    expect(
      refreshResponse.body.accessToken ?? refreshResponse.body.access_token,
    ).toBeDefined();
  });

  it('rotates refresh tokens and rejects the previous refresh token', async () => {
    const rotated = await AuthTestHelper.refresh(http, session.refreshToken);
    expect(rotated.accessToken).toBeDefined();
    expect(rotated.refreshToken).toBeDefined();
    expect(rotated.refreshToken).not.toBe(session.refreshToken);

    const replay = await http
      .post(`${E2E_API_PREFIX}/authentication/refresh`)
      .send({ refreshToken: session.refreshToken });

    expect(replay.status).toBe(HttpStatus.UNAUTHORIZED);
    HttpErrorAssertionHelper.assertErrorContract(replay, {
      statusCode: HttpStatus.UNAUTHORIZED,
      messageContains: 'Invalid or expired session',
    });

    const profile = await http
      .get(`${E2E_API_PREFIX}/users/${session.userId}`)
      .set(AuthTestHelper.bearer(rotated.accessToken));

    expect(profile.status).toBe(HttpStatus.OK);
    session = { ...session, ...rotated };
  });

  it('logout invalidates the current refresh token', async () => {
    await AuthTestHelper.logout(
      http,
      session.refreshToken,
      session.accessToken,
    );

    const refreshAfterLogout = await http
      .post(`${E2E_API_PREFIX}/authentication/refresh`)
      .send({ refreshToken: session.refreshToken });

    expect(refreshAfterLogout.status).toBe(HttpStatus.UNAUTHORIZED);
    HttpErrorAssertionHelper.assertErrorContract(refreshAfterLogout, {
      statusCode: HttpStatus.UNAUTHORIZED,
      messageContains: 'Invalid or expired session',
    });
  });
});
