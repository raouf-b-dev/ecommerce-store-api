import { Response } from 'supertest';

export interface HttpErrorAssertionInput {
  statusCode: number;
  messageContains?: string;
  code?: string;
  hasValidationErrors?: boolean;
}

interface HttpErrorResponseShape {
  success: false;
  statusCode: number;
  message: string;
  timestamp: string;
  code?: string;
  errors?: string[];
}

export class HttpErrorAssertionHelper {
  static assertErrorContract(
    response: Response,
    expected: HttpErrorAssertionInput,
  ): asserts response is Response & { body: HttpErrorResponseShape } {
    expect(response.body).toBeDefined();
    expect(response.body.success).toBe(false);
    expect(response.body.statusCode).toBe(expected.statusCode);
    expect(response.body.message).toEqual(expect.any(String));
    expect(response.body.timestamp).toEqual(expect.any(String));

    if (expected.messageContains) {
      expect(response.body.message).toContain(expected.messageContains);
    }

    if (expected.code) {
      expect(response.body.code).toBe(expected.code);
    }

    if (expected.hasValidationErrors === true) {
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors.length).toBeGreaterThan(0);
    }
  }
}
