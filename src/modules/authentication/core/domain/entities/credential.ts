import { ICredential } from '../interfaces/credential.interface';

export interface CredentialProps {
  id: number | null;
  userId: number;
  passwordHash: string;
  mustChangePassword: boolean;
}

export class Credential implements ICredential {
  private _id: number | null;
  private _userId: number;
  private _passwordHash: string;
  private _mustChangePassword: boolean;

  private constructor(props: CredentialProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._passwordHash = props.passwordHash;
    this._mustChangePassword = props.mustChangePassword;
  }

  get id(): number | null {
    return this._id;
  }

  get userId(): number {
    return this._userId;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  get mustChangePassword(): boolean {
    return this._mustChangePassword;
  }

  set passwordHash(passwordHash: string) {
    this._passwordHash = passwordHash;
  }

  set mustChangePassword(mustChangePassword: boolean) {
    this._mustChangePassword = mustChangePassword;
  }

  toPrimitives(): CredentialProps {
    return {
      id: this._id,
      userId: this._userId,
      passwordHash: this._passwordHash,
      mustChangePassword: this._mustChangePassword,
    };
  }

  static create(props: {
    userId: number;
    passwordHash: string;
    mustChangePassword: boolean;
  }): Credential {
    return new Credential({
      id: null,
      userId: props.userId,
      passwordHash: props.passwordHash,
      mustChangePassword: props.mustChangePassword,
    });
  }

  static fromPersistence(props: {
    id: number;
    userId: number;
    passwordHash: string;
    mustChangePassword: boolean;
  }): Credential {
    return new Credential(props);
  }
}
