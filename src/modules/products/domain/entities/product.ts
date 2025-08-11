import { IProduct } from '../interfaces/IProduct';

export class Product implements IProduct {
  id: number;
  name: string;
  constructor(productData: IProduct) {
    this.id = productData.id;
    this.name = productData.name;
  }
}
