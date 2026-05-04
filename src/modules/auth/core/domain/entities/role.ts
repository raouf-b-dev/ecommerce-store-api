import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { RolePermissionsVO } from '../value-objects/role-permissions';

export interface IRole {
  id: number;
  code: string;
  name: string;
  isSystem: boolean;
  permissions: { codes: string[] };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RoleProps {
  id: number;
  code: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class Role {
  private _id: number;
  private _code: string;
  private _name: string;
  private _isSystem: boolean;
  private _permissions: RolePermissionsVO;
  private _createdAt?: Date;
  private _updatedAt?: Date;

  constructor(props: RoleProps) {
    this._id = props.id;
    this._code = props.code;
    this._name = props.name;
    this._isSystem = props.isSystem;
    this._permissions = RolePermissionsVO.fromCodes(props.permissions);
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get id(): number {
    return this._id;
  }

  get code(): string {
    return this._code;
  }

  get name(): string {
    return this._name;
  }

  get isSystem(): boolean {
    return this._isSystem;
  }

  get permissions(): RolePermissionsVO {
    return this._permissions;
  }

  get createdAt(): Date | undefined {
    return this._createdAt;
  }

  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }

  updateName(name: string): Result<void, DomainError> {
    if (this._isSystem) {
      return ErrorFactory.DomainError('Cannot update name of a system role');
    }
    this._name = name;
    return Result.success(undefined);
  }

  updatePermissions(permissions: string[]): void {
    this._permissions = RolePermissionsVO.fromCodes(permissions);
  }

  validateNotSystemForDeletion(): Result<void, DomainError> {
    if (this._isSystem) {
      return ErrorFactory.DomainError('Cannot delete a system role');
    }
    return Result.success(undefined);
  }

  toPrimitives(): IRole {
    return {
      id: this._id,
      code: this._code,
      name: this._name,
      isSystem: this._isSystem,
      permissions: this._permissions.toPrimitives(),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static fromPrimitives(primitives: IRole): Role {
    return new Role({
      ...primitives,
      permissions: primitives.permissions.codes,
    });
  }
}
