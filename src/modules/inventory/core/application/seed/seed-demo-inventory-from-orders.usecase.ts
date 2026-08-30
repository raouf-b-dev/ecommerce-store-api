import { Injectable, HttpStatus } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { Inventory } from '../../domain/entities/inventory';
import { InventoryRepository } from '../../domain/repositories/inventory.repository';

export type SeedInventoryEffect = 'hold' | 'consume';

export interface SeedDemoInventoryBaselineItem {
  productId: number;
  availableQuantity: number;
}

export interface SeedDemoInventoryEffectLine {
  productId: number;
  quantity: number;
  effect: SeedInventoryEffect;
}

export interface SeedDemoInventoryFromOrdersInput {
  baselines: SeedDemoInventoryBaselineItem[];
  lines: SeedDemoInventoryEffectLine[];
}

export interface SeededDemoInventorySyncItem {
  productId: number;
  availableQuantity: number;
  reservedQuantity: number;
}

/**
 * Rebuilds demo inventory aggregates from order line effects (no reservation rows / SAGA).
 * Every run resets touched SKUs to baseline then applies hold/consume via domain methods.
 */
@Injectable()
export class SeedDemoInventoryFromOrdersUseCase extends UseCase<
  SeedDemoInventoryFromOrdersInput,
  SeededDemoInventorySyncItem[],
  UseCaseError
> {
  constructor(private readonly inventoryRepository: InventoryRepository) {
    super();
  }

  async execute(
    input: SeedDemoInventoryFromOrdersInput,
  ): Promise<Result<SeededDemoInventorySyncItem[], UseCaseError>> {
    const baselineByProduct = new Map(
      input.baselines.map((b) => [b.productId, b.availableQuantity]),
    );

    const productIds = new Set<number>([
      ...input.baselines.map((b) => b.productId),
      ...input.lines.map((l) => l.productId),
    ]);

    const aggregated = this.aggregateLines(input.lines);
    const results: SeededDemoInventorySyncItem[] = [];

    for (const productId of productIds) {
      const baseline = baselineByProduct.get(productId);
      if (baseline === undefined) {
        continue;
      }

      const locked = await this.inventoryRepository.findByProductIdForUpdate(
        productId,
      );
      if (locked.isFailure) {
        if (locked.error.statusCode === HttpStatus.NOT_FOUND) {
          continue;
        }
        return ErrorFactory.UseCaseError(
          `Failed to load inventory for product ${productId}`,
          locked.error,
        );
      }

      const { entity, expectedVersion } = locked.value;
      const primitives = entity.toPrimitives();
      let inventory = Inventory.fromPrimitives({
        ...primitives,
        availableQuantity: baseline,
        reservedQuantity: 0,
      });

      const effect = aggregated.get(productId);
      if (effect) {
        const applyResult = this.applyEffect(inventory, effect);
        if (applyResult.isFailure) {
          return ErrorFactory.UseCaseError(
            `Failed to apply seed inventory effect for product ${productId}`,
            applyResult.error,
          );
        }
        inventory = applyResult.value;
      }

      const saveResult = await this.inventoryRepository.save(
        inventory,
        expectedVersion,
      );
      if (saveResult.isFailure) {
        return ErrorFactory.UseCaseError(
          `Failed to save seeded inventory for product ${productId}`,
          saveResult.error,
        );
      }

      results.push({
        productId,
        availableQuantity: saveResult.value.availableQuantity,
        reservedQuantity: saveResult.value.reservedQuantity,
      });
    }

    return Result.success(results);
  }

  private aggregateLines(
    lines: SeedDemoInventoryEffectLine[],
  ): Map<number, { hold: number; consume: number }> {
    const map = new Map<number, { hold: number; consume: number }>();
    for (const line of lines) {
      const current = map.get(line.productId) ?? { hold: 0, consume: 0 };
      if (line.effect === 'hold') {
        current.hold += line.quantity;
      } else {
        current.consume += line.quantity;
      }
      map.set(line.productId, current);
    }
    return map;
  }

  private applyEffect(
    inventory: Inventory,
    effect: { hold: number; consume: number },
  ): Result<Inventory, UseCaseError> {
    if (effect.hold > 0) {
      const holdResult = inventory.reserveStock(effect.hold);
      if (holdResult.isFailure) {
        return ErrorFactory.UseCaseError(
          holdResult.error.message,
          holdResult.error,
        );
      }
    }

    if (effect.consume > 0) {
      const reserveResult = inventory.reserveStock(effect.consume);
      if (reserveResult.isFailure) {
        return ErrorFactory.UseCaseError(
          reserveResult.error.message,
          reserveResult.error,
        );
      }
      const confirmResult = inventory.confirmReservation(effect.consume);
      if (confirmResult.isFailure) {
        return ErrorFactory.UseCaseError(
          confirmResult.error.message,
          confirmResult.error,
        );
      }
    }

    return Result.success(inventory);
  }
}
