import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { IReservationItem } from '../interfaces/reservation-item.interface';

export interface ReservationItemProps {
  id: number | null;
  productId: number;
  quantity: number;
}

export class ReservationItem implements IReservationItem {
  private readonly _id: number | null;
  private readonly _productId: number;
  private readonly _quantity: number;

  constructor(props: ReservationItemProps) {
    this._id = props.id || null;
    this._productId = props.productId;
    this._quantity = props.quantity;
  }

  get id(): number | null {
    return this._id;
  }

  get productId(): number {
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
    id: number | null;
    productId: number;
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
