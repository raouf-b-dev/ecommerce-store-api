/**
 * Forced credential rotation (mustChangePassword) e2e.
 *
 * Prerequisites: PostgreSQL + Redis running and migrations applied.
 */
import { HttpStatus, INestApplication } from '@nestjs/common';
import { decodeJwt } from 'jose';
import { DataSource } from 'typeorm';
import {
  AuthTestHelper,
  E2E_API_PREFIX,
} from 'src/testing/helpers/auth-test.helper';
import {
  E2eHttpClient,
  E2eTestAppHelper,
} from 'src/testing/helpers/e2e-test-app.helper';
import { HttpErrorAssertionHelper } from 'src/testing/helpers/http-error-assertion.helper';
import { CredentialEntity } from 'src/modules/authentication/secondary-adapters/orm/credential.schema';

describe('Must change password (e2e)', () => {
  let app: INestApplication;
  let http: E2eHttpClient;
  let moduleRef: Awaited<
    ReturnType<typeof E2eTestAppHelper.createApp>
  >['moduleRef'];

  beforeAll(async () => {
    const context = await E2eTestAppHelper.createApp();
    app = context.app;
    moduleRef = context.moduleRef;
    http = E2eTestAppHelper.getHttp(app);
  }, 120_000);

  afterAll(async () => {
    await E2eTestAppHelper.closeApp(app);
  });

  it('blocks domain routes until password is changed, then allows access', async () => {
    const registered = await AuthTestHelper.register(http, {
      firstName: 'MustChange',
      lastName: 'User',
    });

    const dataSource = moduleRef.get(DataSource);
    await dataSource
      .getRepository(CredentialEntity)
      .update({ userId: registered.userId }, { mustChangePassword: true });

    const loginResponse = await http
      .post(`${E2E_API_PREFIX}/authentication/login`)
      .send({ email: registered.email, password: registered.password });

    expect(loginResponse.status).toBe(HttpStatus.OK);
    expect(loginResponse.body.mustChangePassword).toBe(true);

    const accessToken = loginResponse.body.accessToken as string;
    const refreshToken = loginResponse.body.refreshToken as string;

    expect(decodeJwt(accessToken).mustChangePassword).toBe(true);

    const blocked = await http
      .get(`${E2E_API_PREFIX}/users/${registered.userId}`)
      .set(AuthTestHelper.bearer(accessToken));

    expect(blocked.status).toBe(HttpStatus.FORBIDDEN);
    HttpErrorAssertionHelper.assertErrorContract(blocked, {
      statusCode: HttpStatus.FORBIDDEN,
      messageContains: 'Password change required',
      code: 'MUST_CHANGE_PASSWORD',
    });

    const changeResponse = await http
      .post(`${E2E_API_PREFIX}/authentication/change-password`)
      .set(AuthTestHelper.bearer(accessToken))
      .send({
        currentPassword: registered.password,
        newPassword: 'UpdatedPass123!',
      });

    expect(changeResponse.status).toBe(HttpStatus.OK);
    expect(changeResponse.body.mustChangePassword).toBe(false);
    expect(changeResponse.body.accessToken).toBeDefined();

    const newAccessToken = changeResponse.body.accessToken as string;

    // The claim is omitted entirely once the credential is clean, which is what
    // lets the guard skip its database lookup on subsequent requests.
    expect(decodeJwt(newAccessToken).mustChangePassword).toBeUndefined();

    const allowed = await http
      .get(`${E2E_API_PREFIX}/users/${registered.userId}`)
      .set(AuthTestHelper.bearer(newAccessToken));

    expect(allowed.status).toBe(HttpStatus.OK);

    const oldRefresh = await http
      .post(`${E2E_API_PREFIX}/authentication/refresh`)
      .send({ refreshToken });

    expect(oldRefresh.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('picks the flag up on refresh when it is set mid-session', async () => {
    const registered = await AuthTestHelper.register(http, {
      firstName: 'MidSession',
      lastName: 'User',
    });

    const loginResponse = await http
      .post(`${E2E_API_PREFIX}/authentication/login`)
      .send({ email: registered.email, password: registered.password });

    expect(loginResponse.status).toBe(HttpStatus.OK);
    expect(loginResponse.body.mustChangePassword).toBe(false);

    const accessToken = loginResponse.body.accessToken as string;
    const refreshToken = loginResponse.body.refreshToken as string;

    const dataSource = moduleRef.get(DataSource);
    await dataSource
      .getRepository(CredentialEntity)
      .update({ userId: registered.userId }, { mustChangePassword: true });

    // Documented trade-off: the already-issued token carries no claim, so it
    // keeps working until it expires. Rotation takes effect from the next
    // refresh onwards.
    const stillAllowed = await http
      .get(`${E2E_API_PREFIX}/users/${registered.userId}`)
      .set(AuthTestHelper.bearer(accessToken));

    expect(stillAllowed.status).toBe(HttpStatus.OK);

    const refreshed = await http
      .post(`${E2E_API_PREFIX}/authentication/refresh`)
      .send({ refreshToken });

    expect(refreshed.status).toBe(HttpStatus.OK);
    expect(refreshed.body.mustChangePassword).toBe(true);

    const refreshedAccessToken = refreshed.body.accessToken as string;
    expect(decodeJwt(refreshedAccessToken).mustChangePassword).toBe(true);

    const blocked = await http
      .get(`${E2E_API_PREFIX}/users/${registered.userId}`)
      .set(AuthTestHelper.bearer(refreshedAccessToken));

    expect(blocked.status).toBe(HttpStatus.FORBIDDEN);
  });
});
