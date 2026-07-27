/**
 * Shared-kernel interface describing the primitive shape of a resolved
 * role-permissions value. Kept here so global type augmentations (e.g.
 * Express Request) can reference it without taking a dependency on the
 * auth bounded-context's domain layer.
 *
 * Note: Only the data contract is defined here. Behavioural methods like
 * `has()` are added by the concrete `RolePermissionsVO` in the auth module.
 */
export interface IRolePermissions {
  readonly codes: string[];
}
