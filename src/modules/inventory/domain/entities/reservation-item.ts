import { Result } from '../../../../core/domain/result';
import { DomainError } from '../../../../core/errors/domain.error';
import { IReservationItem } from '../interfaces/reservation-item.interface';
import { v4 as uuidv4 } from 'uuid';

export interface ReservationItemProps {
  id: string | null;
  productId: string;
  quantity: number;
}

export class ReservationItem implements IReservationItem {
  private readonly _id: string;
  private readonly _productId: string;
  private readonly _quantity: number;

  constructor(props: ReservationItemProps) {
    this._id = props.id || this.generateUuid();
    this._productId = props.productId;
    this._quantity = props.quantity;
  }

  private generateUuid(): string {
    return uuidv4();
  }

  get id(): string {
    return this._id;
  }

  get productId(): string {
    return this._productId;
  }

  get quantity(): number {
    return this._quantity;
  }

  get props(): ReservationItemProps {
    return {
      id: this._id,
      productId: this._productId,
      quantity: this._quantity,
    };
  }

  toPrimitives(): IReservationItem {
    return {
      id: this._id,
      productId: this._productId,
      quantity: this._quantity,
    };
  }

  static fromPrimitives(data: IReservationItem): ReservationItem {
    return new ReservationItem(data);
  }

  get toProps(): ReservationItemProps {
    return {
      id: this._id,
      productId: this._productId,
      quantity: this._quantity,
    };
  }

  public static create(props: {
    id: string | null;
    productId: string;
    quantity: number;
  }): Result<ReservationItem, DomainError> {
    const reservation = new ReservationItem({
      id: props.id,
      productId: props.productId,
      quantity: props.quantity,
    });

    return Result.success(reservation);
  }
}
