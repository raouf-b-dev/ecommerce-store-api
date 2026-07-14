import { IRolePermissions } from '../../../../../shared-kernel/domain/interfaces/role-permissions.interface';
export type { IRolePermissions };

/** Plain serialized form — no behaviour, safe to cross module boundaries. */

export class RolePermissionsVO implements IRolePermissions {
  private readonly _permissions: Set<string>;

  constructor(permissionCodes: string[]) {
    this._permissions = new Set(permissionCodes);
  }
  /** Get all granted permission codes */
  get codes(): string[] {
    return Array.from(this._permissions);
  }

  /** Check if a specific permission is granted */
  has(code: string): boolean {
    return this._permissions.has(code);
  }

  toPrimitives(): IRolePermissions {
    return { codes: this.codes };
  }

  static fromPrimitives(data: IRolePermissions): RolePermissionsVO {
    return new RolePermissionsVO(data.codes);
  }

  static fromCodes(codes: string[]): RolePermissionsVO {
    return new RolePermissionsVO(codes);
  }
}
