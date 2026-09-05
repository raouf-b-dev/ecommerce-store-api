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

interface E2eCategoryListItem {
  id: number;
  slug: string;
  isActive: boolean;
}

export class E2eCatalogHelper {
  private static async resolveCategoryIdForFixture(
    http: E2eHttpClient,
    accessToken: string,
  ): Promise<number | undefined> {
    const listResponse = await http
      .get(`${E2E_API_PREFIX}/categories`)
      .set(AuthTestHelper.bearer(accessToken));

    if (listResponse.status !== Number(HttpStatus.OK)) {
      return undefined;
    }

    const categories = listResponse.body as E2eCategoryListItem[];
    if (!Array.isArray(categories) || categories.length === 0) {
      return undefined;
    }

    const active = categories.filter((category) => category.isActive);
    const preferred =
      active.find((category) => category.slug === 'electronics') ?? active[0];

    return preferred?.id;
  }

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

    const categoryId = await this.resolveCategoryIdForFixture(
      http,
      admin.accessToken,
    );

    const createResponse = await http
      .post(`${E2E_API_PREFIX}/products`)
      .set(AuthTestHelper.bearer(admin.accessToken))
      .send({
        name,
        sku,
        price: 25,
        currency: 'USD',
        description: 'E2E catalog fixture',
        ...(categoryId != null ? { categoryId } : {}),
      });

    if (createResponse.status !== Number(HttpStatus.CREATED)) {
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
