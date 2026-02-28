import { INotification } from '../interfaces/notification.interface';
import { NotificationStatus } from '../enums/notification-status.enum';
import { randomUUID } from 'crypto';

export interface NotificationProps {
  id: string;
  userId: string | null;
  targetRole: string | null;
  type: string;
  title: string;
  message: string;
  payload?: any;
  status: NotificationStatus;
  failedReason?: string | null;
  deliveredAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
}

export class Notification implements INotification {
  private readonly _id: string;
  private readonly _userId: string | null;
  private readonly _targetRole: string | null;
  private readonly _type: string;
  private readonly _title: string;
  private readonly _message: string;
  private readonly _payload?: any;
  private _status: NotificationStatus;
  private _failedReason: string | null;
  private _deliveredAt: Date | null;
  private readonly _expiresAt: Date | null;
  private readonly _createdAt: Date;

  private constructor(props: NotificationProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._targetRole = props.targetRole;
    this._type = props.type;
    this._title = props.title;
    this._message = props.message;
    this._payload = props.payload;
    this._status = props.status;
    this._failedReason = props.failedReason ?? null;
    this._deliveredAt = props.deliveredAt ?? null;
    this._expiresAt = props.expiresAt ?? null;
    this._createdAt = props.createdAt;
  }

  get id(): string {
    return this._id;
  }

  get userId(): string | null {
    return this._userId;
  }

  get targetRole(): string | null {
    return this._targetRole;
  }

  get type(): string {
    return this._type;
  }

  get title(): string {
    return this._title;
  }

  get message(): string {
    return this._message;
  }

  get payload(): any {
    return this._payload;
  }

  get status(): NotificationStatus {
    return this._status;
  }

  get failedReason(): string | null {
    return this._failedReason;
  }

  get deliveredAt(): Date | null {
    return this._deliveredAt;
  }

  get expiresAt(): Date | null {
    return this._expiresAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  markAsDelivered(): void {
    this._status = NotificationStatus.DELIVERED;
    this._deliveredAt = new Date();
  }

  markAsRead(): void {
    this._status = NotificationStatus.READ;
  }

  markAsFailed(reason: string): void {
    this._status = NotificationStatus.FAILED;
    this._failedReason = reason;
  }

  public static create(
    props: Omit<
      NotificationProps,
      | 'id'
      | 'status'
      | 'failedReason'
      | 'deliveredAt'
      | 'expiresAt'
      | 'createdAt'
    > & {
      expiresAt?: Date | null;
    },
  ): Notification {
    const now = new Date();
    const defaultExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    return new Notification({
      ...props,
      id: randomUUID(),
      status: NotificationStatus.PENDING,
      failedReason: null,
      deliveredAt: null,
      expiresAt: props.expiresAt ?? defaultExpiry,
      createdAt: now,
    });
  }

  public static fromPrimitives(props: INotification): Notification {
    return new Notification({
      id: props.id,
      userId: props.userId,
      targetRole: props.targetRole,
      type: props.type,
      title: props.title,
      message: props.message,
      payload: props.payload,
      status: props.status,
      failedReason: props.failedReason ?? null,
      deliveredAt: props.deliveredAt ? new Date(props.deliveredAt) : null,
      expiresAt: props.expiresAt ? new Date(props.expiresAt) : null,
      createdAt: new Date(props.createdAt),
    });
  }

  toPrimitives(): INotification {
    return {
      id: this.id,
      userId: this.userId,
      targetRole: this.targetRole,
      type: this.type,
      title: this.title,
      message: this.message,
      payload: this.payload,
      status: this.status,
      failedReason: this.failedReason,
      deliveredAt: this.deliveredAt,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
    };
  }

  get props(): NotificationProps {
    return {
      id: this._id,
      userId: this._userId,
      targetRole: this._targetRole,
      type: this._type,
      title: this._title,
      message: this._message,
      payload: this._payload,
      status: this._status,
      failedReason: this._failedReason,
      deliveredAt: this._deliveredAt,
      expiresAt: this._expiresAt,
      createdAt: this._createdAt,
    };
  }
}
