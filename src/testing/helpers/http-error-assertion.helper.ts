export interface HttpResponseLike {
  body: unknown;
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export class HttpErrorAssertionHelper {
  static assertErrorContract<T extends HttpResponseLike>(
    response: T,
    expected: HttpErrorAssertionInput,
  ): asserts response is T & { body: HttpErrorResponseShape } {
    expect(response.body).toBeDefined();
    if (!isRecord(response.body)) {
      throw new Error('Response body must be an object');
    }
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
      expect(response.body.errors).toEqual(expect.any(Array));
      expect(response.body.errors).not.toHaveLength(0);
    }
  }
}
