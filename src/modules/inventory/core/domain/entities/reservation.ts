import { ReservationStatus } from '../value-objects/reservation-status';
import { DomainError } from '../../../../../shared-kernel/errors/domain.error';
import { Result } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/errors/error.factory';
import { IReservation } from '../interfaces/reservation.interface';
import { ReservationItem, ReservationItemProps } from './reservation-item';
import { IReservationItem } from '../interfaces/reservation-item.interface';

export interface ReservationProps {
  id: number | null;
  orderId: number;
  items: ReservationItemProps[];
  status: ReservationStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Reservation implements IReservation {
  private readonly _id: number | null;
  private readonly _orderId: number;
  private readonly _items: ReservationItem[];
  private _status: ReservationStatus;
  private readonly _expiresAt: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: ReservationProps) {
    const validationResult = this.validateProps(props);
    if (validationResult.isFailure) throw validationResult.error;

    const items: ReservationItem[] = [];
    const itemsResult = props.items.map((item) => ReservationItem.create(item));
    itemsResult.forEach((result) => {
      if (result.isFailure) throw result.error;
      items.push(result.value);
    });

    this._id = props.id;
    this._orderId = props.orderId;
    this._items = items;
    this._status = props.status;
    this._expiresAt = props.expiresAt;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  private validateProps(props: ReservationProps): Result<void, DomainError> {
    if (!props.items || props.items.length === 0) {
      return ErrorFactory.DomainError(
        'Reservation must have at least one item',
      );
    }

    for (const item of props.items) {
      if (item.quantity <= 0) {
        return ErrorFactory.DomainError(
          'Reservation item quantity must be positive',
        );
      }
    }

    return Result.success(undefined);
  }

  get id(): number | null {
    return this._id;
  }

  get orderId(): number {
    return this._orderId;
  }

  get items(): IReservationItem[] {
    return this._items.map((item) => item.toPrimitives());
  }

  get status(): ReservationStatus {
    return this._status;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  getItems(): ReservationItem[] {
    return this._items;
  }

  public confirm(): Result<void, DomainError> {
    if (this._status !== ReservationStatus.PENDING) {
      return ErrorFactory.DomainError(
        `Cannot confirm reservation in ${this._status} status`,
      );
    }

    if (this.isExpired()) {
      return ErrorFactory.DomainError('Cannot confirm expired reservation');
    }

    this._status = ReservationStatus.CONFIRMED;
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  public release(): Result<void, DomainError> {
    if (
      this._status === ReservationStatus.RELEASED ||
      this._status === ReservationStatus.EXPIRED
    ) {
      return Result.success(undefined);
    }

    this._status = ReservationStatus.RELEASED;
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  public expire(): Result<void, DomainError> {
    if (this._status !== ReservationStatus.PENDING) {
      return ErrorFactory.DomainError(
        `Cannot expire reservation in ${this._status} status`,
      );
    }

    this._status = ReservationStatus.EXPIRED;
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  public isExpired(): boolean {
    return new Date() > this._expiresAt;
  }

  // Serialization
  toPrimitives(): IReservation {
    return {
      id: this._id,
      orderId: this._orderId,
      items: this._items,
      status: this._status,
      expiresAt: this._expiresAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static fromPrimitives(data: IReservation): Reservation {
    return new Reservation(data);
  }

  get toProps(): ReservationProps {
    return {
      id: this._id,
      orderId: this._orderId,
      items: this._items,
      status: this._status,
      expiresAt: this._expiresAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  public static create(props: {
    orderId: number;
    items: ReservationItemProps[];
    ttlMinutes: number;
  }): Result<Reservation, DomainError> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + props.ttlMinutes);

    const reservation = new Reservation({
      id: null,
      orderId: props.orderId,
      items: props.items,
      status: ReservationStatus.PENDING,
      expiresAt: expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return Result.success(reservation);
  }
}
