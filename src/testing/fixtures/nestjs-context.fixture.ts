import { Request, Response } from 'express';
import { ArgumentsHost, ExecutionContext } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';

export interface RequestWithUser extends Request {
  user?: any;
  userPermissions?: Set<string>;
}

/**
 * Creates a fully-typed jest.Mocked<ArgumentsHost> for HTTP testing.
 */
export function createMockArgumentsHost(
  request: Partial<Request> = {},
  response: Partial<Response> = {},
): jest.Mocked<ArgumentsHost> {
  const mockHttpArgumentsHost: jest.Mocked<HttpArgumentsHost> = {
    getRequest: jest.fn().mockReturnValue(request),
    getResponse: jest.fn().mockReturnValue(response),
    getNext: jest.fn(),
  };

  return {
    switchToHttp: jest.fn().mockReturnValue(mockHttpArgumentsHost),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
  } as unknown as jest.Mocked<ArgumentsHost>;
}

/**
 * Creates a fully-typed jest.Mocked<ExecutionContext> for HTTP testing.
 */
export function createMockExecutionContext(
  request: Partial<Request> = {},
  response: Partial<Response> = {},
): jest.Mocked<ExecutionContext> {
  const host = createMockArgumentsHost(request, response);

  const context = {
    ...host,
    getClass: jest.fn(),
    getHandler: jest.fn(),
  } as unknown as jest.Mocked<ExecutionContext>;
  return context;
}

export function createMockRequest(
  overrides: Partial<Request> = {},
): jest.Mocked<Request> {
  const req = {
    headers: {},
    params: {},
    query: {},
    body: {},
    route: { path: '/' },
    ...overrides,
  };
  return req as unknown as jest.Mocked<Request>;
}

export function createMockResponse(
  overrides: Partial<Response> = {},
): jest.Mocked<Response> {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    ...overrides,
  };
  return res as unknown as jest.Mocked<Response>;
}

export function createMockRequestWithUser(
  user: any,
  overrides: Partial<RequestWithUser> = {},
): jest.Mocked<RequestWithUser> {
  return createMockRequest({
    ...overrides,
    user,
  } as unknown as Partial<Request>) as unknown as jest.Mocked<RequestWithUser>;
}
