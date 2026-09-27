import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';

export interface ProductData {
  id: number | null;
  name: string;
  price: number;
  currency: string;
  imageUrl: string | null;
}

export interface CartProductGateway {
  findById(
    productId: number,
  ): Promise<Result<ProductData | null, InfrastructureError>>;
}
