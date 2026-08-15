import { HttpStatus } from '@nestjs/common';
import { E2eHttpClient } from './e2e-test-app.helper';

export const E2E_API_PREFIX = '/v1';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterUserInput {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthSession {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userId: number;
  accessToken: string;
  refreshToken: string;
}

export class AuthTestHelper {
  static readonly password = 'Password123!';

  static bearer(accessToken: string): { Authorization: string } {
    return { Authorization: `Bearer ${accessToken}` };
  }

  static async register(
    http: E2eHttpClient,
    input: RegisterUserInput = {},
  ): Promise<{
    userId: number;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }> {
    const firstName = input.firstName ?? 'E2E';
    const lastName = input.lastName ?? 'User';
    const email =
      input.email ??
      `e2e-${firstName.toLowerCase()}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}@example.com`;
    const password = input.password ?? AuthTestHelper.password;

    const response = await http
      .post(`${E2E_API_PREFIX}/authentication/register`)
      .send({
        email,
        password,
        firstName,
        lastName,
      });

    expect(response.status).toBe(HttpStatus.CREATED);
    const userId = Number(response.body.id);
    expect(userId).toBeGreaterThan(0);

    return { userId, email, password, firstName, lastName };
  }

  static async login(
    http: E2eHttpClient,
    credentials: LoginCredentials,
    expectedStatus: number = HttpStatus.OK,
  ): Promise<Pick<AuthSession, 'accessToken' | 'refreshToken'>> {
    const response = await http
      .post(`${E2E_API_PREFIX}/authentication/login`)
      .send(credentials)
      .expect(expectedStatus);

    const accessToken =
      response.body?.accessToken ?? response.body?.access_token;
    const refreshToken =
      response.body?.refreshToken ?? response.body?.refresh_token;

    if (!accessToken || !refreshToken) {
      throw new Error(
        'Expected login response to include accessToken and refreshToken.',
      );
    }

    return { accessToken, refreshToken };
  }

  static async registerAndLogin(
    http: E2eHttpClient,
    input: RegisterUserInput = {},
  ): Promise<AuthSession> {
    const registered = await this.register(http, input);
    const tokens = await this.login(http, {
      email: registered.email,
      password: registered.password,
    });

    return {
      ...registered,
      ...tokens,
    };
  }

  static async refresh(
    http: E2eHttpClient,
    refreshToken: string,
    expectedStatus: number = HttpStatus.OK,
  ): Promise<Pick<AuthSession, 'accessToken' | 'refreshToken'>> {
    const response = await http
      .post(`${E2E_API_PREFIX}/authentication/refresh`)
      .send({ refreshToken })
      .expect(expectedStatus);

    if (expectedStatus !== 200) {
      return { accessToken: '', refreshToken: '' };
    }

    const accessToken =
      response.body?.accessToken ?? response.body?.access_token;
    const nextRefreshToken =
      response.body?.refreshToken ??
      response.body?.refresh_token ??
      refreshToken;

    if (!accessToken) {
      throw new Error('Expected refresh response to include accessToken.');
    }

    return { accessToken, refreshToken: nextRefreshToken };
  }

  static async logout(
    http: E2eHttpClient,
    refreshToken: string,
    accessToken: string,
    expectedStatus: number = HttpStatus.NO_CONTENT,
  ): Promise<void> {
    await http
      .post(`${E2E_API_PREFIX}/authentication/logout`)
      .set(this.bearer(accessToken))
      .send({ refreshToken })
      .expect(expectedStatus);
  }

  static async logoutAll(
    http: E2eHttpClient,
    refreshToken: string,
    accessToken: string,
    expectedStatus: number = HttpStatus.NO_CONTENT,
  ): Promise<void> {
    await http
      .post(`${E2E_API_PREFIX}/authentication/logout-all`)
      .set(this.bearer(accessToken))
      .send({ refreshToken })
      .expect(expectedStatus);
  }
}
