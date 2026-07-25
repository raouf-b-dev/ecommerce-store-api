export interface IPermission {
  id: number;
  code: string;
  description: string | null;
}

export interface PermissionProps {
  id: number;
  code: string;
  description: string | null;
}

export class Permission {
  private _id: number;
  private _code: string;
  private _description: string | null;

  constructor(props: PermissionProps) {
    this._id = props.id;
    this._code = props.code;
    this._description = props.description;
  }

  get id(): number {
    return this._id;
  }

  get code(): string {
    return this._code;
  }

  get description(): string | null {
    return this._description;
  }

  toPrimitives(): IPermission {
    return {
      id: this._id,
      code: this._code,
      description: this._description,
    };
  }

  static fromPrimitives(primitives: IPermission): Permission {
    return new Permission(primitives);
  }
}
