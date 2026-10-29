import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { Result } from '../../../../../shared-kernel/domain/result';

export interface DemoSeedAuthUserReport {
  email: string;
  status: 'created' | 'existing';
}

/** Counts from one idempotent demo seed run. Emails are the public demo accounts. */
export interface DemoSeedReport {
  authOnly: boolean;
  /** Null when DEMO_READ_ONLY seeded the hosted viewer instead. */
  superAdmin: DemoSeedAuthUserReport | null;
  /** Null when DEMO_READ_ONLY seeded the hosted viewer instead. */
  admin: DemoSeedAuthUserReport | null;
  /** Null when DEMO_READ_ONLY is false (local Compose seeds writable admins). */
  viewer: DemoSeedAuthUserReport | null;
  /** Null when DEMO_READ_ONLY is true (visitors register themselves). */
  customer: DemoSeedAuthUserReport | null;
  categories: number;
  categoriesCreated: number;
  products: number;
  productsCreated: number;
  inventory: number;
  inventoryCreated: number;
  cartItems: number;
  orders: number;
  ordersCreated: number;
  payments: number;
  paymentsCreated: number;
  links: number;
  inventorySynced: number;
}

export interface DemoSeedRunOptions {
  /** When true, only demo auth users are reconciled (CLI e2e prep). */
  authOnly: boolean;
}

export abstract class DemoSeedRunner {
  abstract run(
    options: DemoSeedRunOptions,
  ): Promise<Result<DemoSeedReport, UseCaseError>>;
}
