export abstract class CartSessionTokenService {
  abstract generateToken(cartId: number): Promise<string>;
  abstract validateToken(token: string, cartId: number): Promise<boolean>;
}
