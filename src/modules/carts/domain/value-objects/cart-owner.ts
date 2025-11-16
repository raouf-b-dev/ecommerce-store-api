// src/modules/carts/domain/value-objects/cart-owner.ts
import { Result } from '../../../../core/domain/result';
import { DomainError } from '../../../../core/errors/domain.error';
import { ErrorFactory } from '../../../../core/errors/error.factory';

export enum CartOwnerType {
  GUEST = 'GUEST',
  USER = 'USER',
}

export class CartOwner {
  private readonly _type: CartOwnerType;
  private readonly _identifier: string;

  constructor(type: CartOwnerType, identifier: string) {
    const validationResult = this.validateProps(identifier);
    if (validationResult.isFailure) throw validationResult.error;

    this._type = type;
    this._identifier = identifier.trim();
  }

  private validateProps(identifier: string): Result<void, DomainError> {
    if (!identifier?.trim()) {
      return ErrorFactory.DomainError('Cart owner identifier is required');
    }

    return Result.success(undefined);
  }

  get type(): CartOwnerType {
    return this._type;
  }

  get identifier(): string {
    return this._identifier;
  }

  isGuest(): boolean {
    return this._type === CartOwnerType.GUEST;
  }

  isUser(): boolean {
    return this._type === CartOwnerType.USER;
  }

  equals(other: CartOwner): boolean {
    return this._type === other._type && this._identifier === other._identifier;
  }

  static forGuest(sessionId: string): CartOwner {
    return new CartOwner(CartOwnerType.GUEST, sessionId);
  }

  static forUser(customerId: string): CartOwner {
    return new CartOwner(CartOwnerType.USER, customerId);
  }
}
