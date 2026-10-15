import * as crypto from 'crypto';

export interface SessionTokenProps {
  id: string; // UUID
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt: Date | null;
  createdAt: Date;
}

export class SessionToken {
  private readonly _id: string;
  private readonly _userId: number;
  private _tokenHash: string;
  private _expiresAt: Date;
  private _isRevoked: boolean;
  private _revokedAt: Date | null;
  private readonly _createdAt: Date;

  constructor(props: SessionTokenProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._tokenHash = props.tokenHash;
    this._expiresAt = props.expiresAt;
    this._isRevoked = props.isRevoked;
    this._revokedAt = props.revokedAt;
    this._createdAt = props.createdAt;
  }

  get id(): string {
    return this._id;
  }
  get userId(): number {
    return this._userId;
  }
  get tokenHash(): string {
    return this._tokenHash;
  }
  get expiresAt(): Date {
    return new Date(this._expiresAt);
  }
  get isRevoked(): boolean {
    return this._isRevoked;
  }
  get revokedAt(): Date | null {
    return this._revokedAt ? new Date(this._revokedAt) : null;
  }
  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get isValid(): boolean {
    return !this._isRevoked && !this.isExpired;
  }

  get isExpired(): boolean {
    return new Date() > this._expiresAt;
  }

  isTokenMatch(rawToken: string): boolean {
    return this._tokenHash === SessionToken.hash(rawToken);
  }

  /**
   * Replaces the stored secret. Callers copy tokenHash first and persist
   * with that expected hash so a second writer cannot commit.
   */
  rotate(rawToken: string, expiresAt: Date): void {
    this._tokenHash = SessionToken.hash(rawToken);
    this._expiresAt = expiresAt;
  }

  revoke(): void {
    if (this._isRevoked) return;
    this._isRevoked = true;
    this._revokedAt = new Date();
  }

  toPrimitives(): SessionTokenProps {
    return {
      id: this._id,
      userId: this._userId,
      tokenHash: this._tokenHash,
      expiresAt: this._expiresAt,
      isRevoked: this._isRevoked,
      revokedAt: this._revokedAt,
      createdAt: this._createdAt,
    };
  }

  static fromPrimitives(props: SessionTokenProps): SessionToken {
    return new SessionToken(props);
  }

  static create(
    userId: number,
    rawToken: string,
    expiresAt: Date,
    id?: string,
  ): SessionToken {
    return new SessionToken({
      id: id || crypto.randomUUID(),
      userId,
      tokenHash: SessionToken.hash(rawToken),
      expiresAt,
      isRevoked: false,
      revokedAt: null,
      createdAt: new Date(),
    });
  }

  private static hash(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }
}
