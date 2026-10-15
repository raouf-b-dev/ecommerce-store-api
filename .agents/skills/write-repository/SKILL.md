---
name: write-repository
description: Implement or change a repository adapter, domain-to-ORM mapper, ORM entity, or any versioned (optimistic locking) write. Use when touching secondary-adapters persistence code, `expectedVersion`, `toUpdatePayload`, `CreateFromEntity`, or `Relation<T>`.
---

# Repositories, mappers, optimistic locking

The rule is invariant 10 in [ARCHITECTURE-INVARIANTS.md](../../../docs/ai/ARCHITECTURE-INVARIANTS.md); this skill is the code. Rationale: [ADR-0005](../../../docs/architecture/adr/ADR-0005-typed-atomic-occ-update-contract.md) and [OPTIMISTIC-LOCKING.md](../../../docs/data/concurrency/OPTIMISTIC-LOCKING.md). Real example: `src/modules/products/secondary-adapters/repositories/postgres-product-repository/` (inventory inlines `.set()` and has no `toUpdatePayload`).

## Mapper

1. `toDomain(entity)` builds the aggregate. `toEntity(domain)` types its payload with `CreateFromEntity<TEntity>` built from `toPrimitives()`, then `Object.assign(new Entity(), payload)`.
2. Versioned aggregates add `toUpdatePayload(domain)` typed `UpdateFromEntity<TEntity, ExcludeKeys>`. `ExcludeKeys` is the ownership list: `id`, `version`, `@CreateDateColumn`, `@UpdateDateColumn`, and relations saved separately. It is not "fields we skip today".
3. Bidirectional ORM relations use `Relation<T>`.

## Port and use case

```typescript
abstract class ProductRepository {
  abstract findByIdForUpdate(
    id: number,
  ): Promise<
    Result<{ entity: Product; expectedVersion: number }, RepositoryError>
  >;
  abstract save(
    product: Product,
    expectedVersion?: number,
  ): Promise<Result<Product, RepositoryError>>;
}
```

The use case passes `expectedVersion` as a plain value from `findByIdForUpdate` to `save`. For cross-request flows (GET, edit, PUT) the response DTO exposes `version` and the update command carries `expectedVersion`.

## Adapter

```typescript
async save(
  product: Product,
  expectedVersion?: number,
): Promise<Result<Product, RepositoryError>> {
  try {
    if (expectedVersion !== undefined) {
      return await this.updateWithOptimisticLock(product, expectedVersion);
    }
    return await this.saveNormally(product);
  } catch (error) {
    if (error instanceof RepositoryError) return Result.failure(error);
    return ErrorFactory.RepositoryError('Failed to save the product', error);
  }
}

private async updateWithOptimisticLock(
  product: Product,
  expectedVersion: number,
): Promise<Result<Product, RepositoryError>> {
  const { id } = product;
  if (id === null) {
    return ErrorFactory.RepositoryError('Cannot update an unsaved Product');
  }
  const res = await this.ormRepo
    .createQueryBuilder()
    .update(ProductEntity)
    .set({
      ...ProductMapper.toUpdatePayload(product),
      version: () => 'version + 1',
      updatedAt: () => 'CURRENT_TIMESTAMP',
    })
    .where('id = :id AND version = :expectedVersion', { id, expectedVersion })
    .execute();

  if (res.affected === 0) {
    return ErrorFactory.RepositoryError(
      'Optimistic lock failure',
      undefined,
      HttpStatus.CONFLICT,
    );
  }
  const updated = await this.ormRepo.findOneByOrFail({ id });
  return Result.success(ProductMapper.toDomain(updated));
}

private async saveNormally(
  product: Product,
): Promise<Result<Product, RepositoryError>> {
  const saved = await this.ormRepo.save(ProductMapper.toEntity(product));
  product.setId(saved.id);
  return Result.success(product);
}
```

QueryBuilder `UPDATE` skips TypeORM hooks, so stamp `version` and `updatedAt` in `.set()`. The real adapter also checks on zero rows whether the row exists, to return 404 instead of 409 (`resolveOptimisticLockMiss`).

## Rules

- Repositories return domain entities in `Result`, never ORM entities or query builders. Wrap thrown driver errors with `ErrorFactory.RepositoryError(message, error)`.
- Batch jobs read with keyset pagination (`findBatch`), not `OFFSET`.
- Schema changes need a migration. Never edit an applied one.
- Tests: unit spec (insert vs OCC update, `affected === 0` gives 409, not found) per `write-tests`; real-database OCC spec per [INTEGRATION-TESTING-GUIDE.md](../../../docs/testing/INTEGRATION-TESTING-GUIDE.md) section 6.
