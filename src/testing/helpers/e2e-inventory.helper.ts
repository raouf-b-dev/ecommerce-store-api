import { HttpStatus } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { InventoryRepository } from 'src/modules/inventory/core/domain/repositories/inventory.repository';
import { E2E_API_PREFIX } from './auth-test.helper';
import { E2eHttpClient } from './e2e-test-app.helper';
import { isHttpStatus } from './http-status.helper';
import { pollUntil } from './poll.helper';

export interface InventorySnapshot {
  availableQuantity: number;
  reservedQuantity: number;
}

export class E2eInventoryHelper {
  static async getProductStock(
    http: E2eHttpClient,
    productId: number,
  ): Promise<InventorySnapshot> {
    const response = await http.get(
      `${E2E_API_PREFIX}/inventory/products/${productId}`,
    );
    expect(response.status).toBe(HttpStatus.OK);
    return {
      availableQuantity: Number(response.body.availableQuantity),
      reservedQuantity: Number(response.body.reservedQuantity),
    };
  }

  /**
   * Slow poll for post-SAGA stock settlement. Avoids tight-looping the public
   * inventory endpoint (global IP throttler → 429).
   */
  static async waitForProductStock(
    http: E2eHttpClient,
    productId: number,
    expected: InventorySnapshot,
    description: string,
  ): Promise<InventorySnapshot> {
    return pollUntil(
      async () => {
        const response = await http.get(
          `${E2E_API_PREFIX}/inventory/products/${productId}`,
        );
        if (!isHttpStatus(response.status, HttpStatus.OK)) {
          return null;
        }
        const snapshot = {
          availableQuantity: Number(response.body.availableQuantity),
          reservedQuantity: Number(response.body.reservedQuantity),
        };
        return snapshot.availableQuantity === expected.availableQuantity &&
          snapshot.reservedQuantity === expected.reservedQuantity
          ? snapshot
          : null;
      },
      {
        description,
        timeoutMs: 90_000,
        intervalMs: 5_000,
      },
    );
  }

  /** Fixture-only stock override (same pattern as catalog seed). */
  static async setAvailableQuantity(
    moduleRef: TestingModule,
    productId: number,
    quantity: number,
  ): Promise<void> {
    const inventoryRepository = moduleRef.get(InventoryRepository, {
      strict: false,
    });
    const found = await inventoryRepository.findByProductIdForUpdate(productId);
    if (found.isFailure) {
      throw new Error(
        `Failed to load inventory for product ${productId}: ${found.error.message}`,
      );
    }
    const { entity: inventory, expectedVersion } = found.value;
    const setResult = inventory.setStock(quantity);
    if (setResult.isFailure) {
      throw new Error(
        `Failed to set stock for product ${productId}: ${setResult.error.message}`,
      );
    }
    const saveResult = await inventoryRepository.save(
      inventory,
      expectedVersion,
    );
    if (saveResult.isFailure) {
      throw new Error(
        `Failed to save inventory for product ${productId}: ${saveResult.error.message}`,
      );
    }
  }
}
