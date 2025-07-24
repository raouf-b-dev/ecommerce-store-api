import { Order } from '../entities/order.entity';

export abstract class OrderRepository {
  abstract save(order: Order): Promise<void>;
  abstract findById(id: number): Promise<Order | null>;
  abstract findAll(): Promise<Order[]>;
  abstract deleteById(id: number): Promise<void>;
}
