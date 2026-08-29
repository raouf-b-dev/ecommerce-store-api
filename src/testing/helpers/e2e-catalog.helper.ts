import { HttpStatus } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { SeedSuperAdminUseCase } from 'src/modules/authentication/core/application/seed/seed-super-admin.usecase';
import { Inventory } from 'src/modules/inventory/core/domain/entities/inventory';
import { InventoryRepository } from 'src/modules/inventory/core/domain/repositories/inventory.repository';
import {
  AuthSession,
  AuthTestHelper,
  E2E_API_PREFIX,
} from './auth-test.helper';
import { E2eHttpClient } from './e2e-test-app.helper';

export interface E2eCatalogProduct {
  id: number;
  sku: string;
  name: string;
}

export class E2eCatalogHelper {
  static async seedAdminSession(
    moduleRef: TestingModule,
    http: E2eHttpClient,
  ): Promise<AuthSession> {
    const email = `e2e-admin-${Date.now()}@example.com`;
    const password = AuthTestHelper.password;
    const seeder = moduleRef.get(SeedSuperAdminUseCase, { strict: false });
    const seedResult = await seeder.execute({ email, password });
    if (seedResult.isFailure) {
      throw new Error(`Failed to seed E2E admin: ${seedResult.error.message}`);
    }

    const tokens = await AuthTestHelper.login(http, { email, password });
    const rotated = await AuthTestHelper.changePassword(
      http,
      tokens.accessToken,
      password,
    );

    return {
      email,
      password: AuthTestHelper.rotatedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      userId: 0,
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken || tokens.refreshToken,
    };
  }

  static async createProductWithStock(
    moduleRef: TestingModule,
    http: E2eHttpClient,
    admin: AuthSession,
    availableQuantity: number,
    label: string,
  ): Promise<E2eCatalogProduct> {
    const sku = `E2E-${label}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 6)}`.toUpperCase();
    const name = `E2E ${label} ${sku}`;

    const createResponse = await http
      .post(`${E2E_API_PREFIX}/products`)
      .set(AuthTestHelper.bearer(admin.accessToken))
      .send({
        name,
        sku,
        price: 25,
        currency: 'USD',
        description: 'E2E catalog fixture',
      });

    expect(createResponse.status).toBe(HttpStatus.CREATED);
    if (createResponse.status !== HttpStatus.CREATED) {
      throw new Error(
        `Failed to create E2E product (${createResponse.status}): ${JSON.stringify(createResponse.body)}`,
      );
    }
    const productId = Number(createResponse.body.id);
    expect(productId).toBeGreaterThan(0);

    const inventoryRepository = moduleRef.get(InventoryRepository, {
      strict: false,
    });
    const saveResult = await inventoryRepository.save(
      Inventory.createForProduct(productId, availableQuantity),
    );
    if (saveResult.isFailure) {
      throw new Error(
        `Failed to seed inventory for product ${productId}: ${saveResult.error.message}`,
      );
    }

    return { id: productId, sku, name };
  }
}
