import { HttpStatus } from '@nestjs/common';
import { E2eHttpClient } from './e2e-test-app.helper';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
}

export class AuthTestHelper {
  static bearer(accessToken: string): string {
    return `Bearer ${accessToken}`;
  }

  static async login(
    http: E2eHttpClient,
    credentials: LoginCredentials,
    expectedStatus: number = HttpStatus.OK,
  ): Promise<AuthSession> {
    const response = await http
      .post('/auth/login')
      .send(credentials)
      .expect(expectedStatus);

    const accessToken =
      response.body?.accessToken ?? response.body?.access_token;
    const refreshToken =
      response.body?.refreshToken ?? response.body?.refresh_token;

    if (!accessToken || !refreshToken) {
      throw new Error(
        'Expected login response to include access_token and refresh_token.',
      );
    }

    return { accessToken, refreshToken };
  }

  static async refreshAccessToken(
    http: E2eHttpClient,
    refreshToken: string,
    expectedStatus: number = HttpStatus.OK,
  ): Promise<string> {
    const response = await http
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(expectedStatus);

    const accessToken =
      response.body?.accessToken ?? response.body?.access_token;

    if (!accessToken) {
      throw new Error('Expected refresh response to include access_token.');
    }

    return accessToken;
  }

  static async logout(
    http: E2eHttpClient,
    accessToken: string,
    expectedStatus: number = HttpStatus.NO_CONTENT,
  ): Promise<void> {
    await http
      .post('/auth/logout')
      .set('Authorization', this.bearer(accessToken))
      .expect(expectedStatus);
  }

  static async logoutAll(
    http: E2eHttpClient,
    accessToken: string,
    expectedStatus: number = HttpStatus.NO_CONTENT,
  ): Promise<void> {
    await http
      .post('/auth/logout-all')
      .set('Authorization', this.bearer(accessToken))
      .expect(expectedStatus);
  }
}
