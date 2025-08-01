import { Order } from '../entities/order';

export abstract class OrderRepository {
  abstract save(order: Order): Promise<void>;
  abstract update(order: Order): Promise<void>;
  abstract findById(id: number): Promise<Order | null>;
  abstract findAll(): Promise<Order[]>;
  abstract deleteById(id: number): Promise<void>;
}
