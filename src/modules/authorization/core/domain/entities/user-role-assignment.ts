import { IUserRoleAssignment } from '../interfaces/user-role-assignment.interface';

export type UserRoleAssignmentProps = {
  id: number | null;
  userId: number;
  roleId: number;
  createdAt: Date;
  updatedAt: Date;
};

export class UserRoleAssignment implements IUserRoleAssignment {
  private _id: number | null;
  private _userId: number;
  private _roleId: number;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: UserRoleAssignmentProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._roleId = props.roleId;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get id(): number | null {
    return this._id;
  }

  get userId(): number {
    return this._userId;
  }

  get roleId(): number {
    return this._roleId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateRole(roleId: number): void {
    this._roleId = roleId;
    this._updatedAt = new Date();
  }

  toPrimitives(): IUserRoleAssignment {
    return {
      id: this._id,
      userId: this._userId,
      roleId: this._roleId,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static create(props: { userId: number; roleId: number }): UserRoleAssignment {
    const now = new Date();
    return new UserRoleAssignment({
      id: null,
      userId: props.userId,
      roleId: props.roleId,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: {
    id: number;
    userId: number;
    roleId: number;
    createdAt: Date;
    updatedAt: Date;
  }): UserRoleAssignment {
    return new UserRoleAssignment({
      id: props.id,
      userId: props.userId,
      roleId: props.roleId,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }
}
