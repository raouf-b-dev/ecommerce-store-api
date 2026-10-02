/**
 * Input sanitization regression suite (e2e).
 *
 * Verifies that:
 * 1. User registration inputs are sanitized against XSS while raw passwords with < > & are preserved.
 * 2. Login over HTTP succeeds using the exact same < > & password registered over HTTP.
 * 3. Stripe webhook payloads remain untouched and are passed unmutated to the webhook handler.
 * 4. Authorization routes (/v1/authorization/... and /v1/roles) are properly sanitized.
 *
 * Prerequisites: PostgreSQL + Redis running (`npm run d:up:dev`) and migrations applied.
 */
import {
  Body,
  Controller,
  HttpStatus,
  INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { Public } from 'src/guards/decorators/public.decorator';
import { HandleStripeWebhookUseCase } from 'src/modules/payments/core/application/usecases/handle-stripe-webhook/handle-stripe-webhook.usecase';
import {
  AuthSession,
  AuthTestHelper,
  E2E_API_PREFIX,
} from 'src/testing/helpers/auth-test.helper';
import { E2eCatalogHelper } from 'src/testing/helpers/e2e-catalog.helper';
import {
  E2eHttpClient,
  E2eTestAppHelper,
} from 'src/testing/helpers/e2e-test-app.helper';

@Controller('authorization')
class AuthorizationRouteTestController {
  @Post('inspect')
  @Public()
  inspectPayload(@Body() body: Record<string, unknown>) {
    return { echo: body };
  }
}

@Module({
  controllers: [AuthorizationRouteTestController],
})
class AuthorizationTestModule {}

describe('Input sanitization (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let http: E2eHttpClient;

  beforeAll(async () => {
    const context = await E2eTestAppHelper.createApp({
      imports: [AppModule, AuthorizationTestModule],
    });
    app = context.app;
    moduleRef = context.moduleRef;
    http = E2eTestAppHelper.getHttp(app);
  }, 120_000);

  afterAll(async () => {
    await E2eTestAppHelper.closeApp(app);
  });

  it('registers over HTTP with a <>& password and logs in with the exact same password', async () => {
    const email = `sanitize-http-flow-${Date.now()}@example.com`;
    const passwordWithSpecialChars = 'P@ss<word>&123!';

    const registerResponse = await http
      .post(`${E2E_API_PREFIX}/authentication/register`)
      .send({
        email,
        password: passwordWithSpecialChars,
        firstName: '<script>alert("xss")</script>Jane',
        lastName: '<b>Doe</b>',
      });

    expect(registerResponse.status).toBe(HttpStatus.CREATED);
    expect(registerResponse.body.firstName).toBe('Jane');
    expect(registerResponse.body.lastName).toBe('Doe');
    expect(registerResponse.body.email).toBe(email);

    const loginResponse = await http
      .post(`${E2E_API_PREFIX}/authentication/login`)
      .send({
        email,
        password: passwordWithSpecialChars,
      });

    expect(loginResponse.status).toBe(HttpStatus.OK);
    expect(loginResponse.body.accessToken).toBeDefined();
  });

  it('leaves the webhook body untouched and asserts what the webhook handler actually receives', async () => {
    const webhookUseCase = moduleRef.get(HandleStripeWebhookUseCase);
    const executeSpy = jest.spyOn(webhookUseCase, 'execute');

    const rawPayload = {
      type: 'payment_intent.created',
      data: {
        object: {
          id: 'pi_test_sanitize',
          metadata: {
            note: '<script>alert("xss")</script> Raw & Untouched Payload',
          },
        },
      },
    };

    const response = await http
      .post(`${E2E_API_PREFIX}/payments/webhooks/stripe`)
      .set('stripe-signature', 'e2e-test')
      .send(rawPayload);

    expect(response.status).toBe(HttpStatus.OK);
    expect(executeSpy).toHaveBeenCalledTimes(1);

    const receivedCommand = executeSpy.mock.calls[0][0];
    expect(receivedCommand.signature).toBe('e2e-test');
    expect(receivedCommand.payload).toEqual(rawPayload);
    expect(receivedCommand.payload.data.object.metadata.note).toBe(
      '<script>alert("xss")</script> Raw & Untouched Payload',
    );

    executeSpy.mockRestore();
  });

  it('sanitizes payloads sent to /v1/authorization/... routes', async () => {
    const response = await http
      .post(`${E2E_API_PREFIX}/authorization/inspect`)
      .send({
        description: '<b>Role permissions</b>',
        note: '<script>alert("auth")</script>Important note',
      });

    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body.echo.description).toBe('Role permissions');
    expect(response.body.echo.note).toBe('Important note');
  });

  it('sanitizes authorization role management creation (/v1/roles)', async () => {
    const adminSession: AuthSession = await E2eCatalogHelper.seedAdminSession(
      moduleRef,
      http,
    );

    const roleResponse = await http
      .post(`${E2E_API_PREFIX}/roles`)
      .set(AuthTestHelper.bearer(adminSession.accessToken))
      .send({
        code: `ROLE_SAN_${Date.now()}`,
        name: '<script>alert(1)</script>Security Admin',
        permissions: ['view_all_products'],
      });

    expect(roleResponse.status).toBe(HttpStatus.CREATED);
    expect(roleResponse.body.name).toBe('Security Admin');
  });
});
