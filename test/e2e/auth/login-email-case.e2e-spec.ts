/**
 * Login accepts the same mixed-case email used at register, and the lowercase form.
 *
 * Prerequisites: PostgreSQL + Redis running and migrations applied.
 */
import { HttpStatus, INestApplication } from '@nestjs/common';
import {
  AuthTestHelper,
  E2E_API_PREFIX,
} from 'src/testing/helpers/auth-test.helper';
import {
  E2eHttpClient,
  E2eTestAppHelper,
} from 'src/testing/helpers/e2e-test-app.helper';

describe('Login email case (e2e)', () => {
  let app: INestApplication;
  let http: E2eHttpClient;

  beforeAll(async () => {
    const context = await E2eTestAppHelper.createApp();
    app = context.app;
    http = E2eTestAppHelper.getHttp(app);
  }, 120_000);

  afterAll(async () => {
    await E2eTestAppHelper.closeApp(app);
  });

  it('logs in with the mixed-case register email and with its lowercase form', async () => {
    const mixedCaseEmail = `MixCase-9-${Date.now()}@Test.local`;
    const password = AuthTestHelper.password;

    const registered = await AuthTestHelper.register(http, {
      email: mixedCaseEmail,
      password,
      firstName: 'Mix',
      lastName: 'Case',
    });

    const mixedLogin = await http
      .post(`${E2E_API_PREFIX}/authentication/login`)
      .send({ email: mixedCaseEmail, password });

    expect(mixedLogin.status).toBe(HttpStatus.OK);
    expect(
      mixedLogin.body.accessToken ?? mixedLogin.body.access_token,
    ).toBeDefined();

    const lowerLogin = await http
      .post(`${E2E_API_PREFIX}/authentication/login`)
      .send({ email: mixedCaseEmail.toLowerCase(), password });

    expect(lowerLogin.status).toBe(HttpStatus.OK);
    expect(
      lowerLogin.body.accessToken ?? lowerLogin.body.access_token,
    ).toBeDefined();
    expect(registered.email).toBe(mixedCaseEmail);
  });
});
