import { IOrder } from '../interfaces/IOrder';

export class Order implements IOrder {
  id: number;
  totalPrice: number;
  constructor(orderData: IOrder) {
    this.id = orderData.id;
    this.totalPrice = orderData.totalPrice;
  }
}
