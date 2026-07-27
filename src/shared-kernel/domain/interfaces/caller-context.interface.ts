export type CallerKind = 'user' | 'system';

export interface CallerContext {
  kind: CallerKind;
  userId: number;
  role: string;
  permissions: ReadonlySet<string>;
}

export type SystemCallerContext = CallerContext & { kind: 'system' };
export type UserCallerContext = CallerContext & { kind: 'user' };

/** Internal-only caller for jobs and ACL gateways. Never construct from HTTP. */
export const SYSTEM_CALLER_CONTEXT: SystemCallerContext = {
  kind: 'system',
  userId: 0,
  role: 'SYSTEM',
  permissions: new Set(),
};

export function isSystemCaller(
  context: CallerContext | null | undefined,
): context is SystemCallerContext {
  return context?.kind === 'system';
}

export function createUserCallerContext(input: {
  userId: number;
  role: string;
  permissions: ReadonlySet<string> | { has(code: string): boolean };
}): UserCallerContext {
  return {
    kind: 'user',
    userId: Number(input.userId),
    role: input.role,
    permissions: input.permissions as ReadonlySet<string>,
  };
}
