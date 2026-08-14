# Codebase Anti-Patterns & Review Checklist

---

Document Type: Applied Guide & Review Checklist
Audience: Backend Engineers & AI Code Reviewers
Status: Active
Owner: Architecture & Quality Team

---

This document provides concrete **Good ✅ vs. Bad ❌ code examples** and a review checklist to enforce architectural rules during code generation and peer reviews.

---

## 1. Controller Layer Anti-Patterns

### Rule: Controllers must be thin and delegate directly to use cases.

#### ❌ BAD (Business logic and ORM in Controller):

```typescript
@Post('reserve')
async reserveStock(@Body() dto: ReserveStockDto) {
  const inv = await this.inventoryOrmRepo.findOne({ where: { productId: dto.productId } });
  if (inv.availableQuantity < dto.quantity) {
    throw new BadRequestException('Insufficient stock');
  }
  inv.availableQuantity -= dto.quantity;
  await this.inventoryOrmRepo.save(inv);
  return inv;
}
```

#### ✅ GOOD (Thin Controller delegating to Use Case):

```typescript
@Post('reserve')
async reserveStock(@Body() dto: ReserveStockDto): Promise<ReservationResponseDto> {
  const result = await this.reserveStockUseCase.execute(dto.toCommand());
  if (result.isFailure) {
    throw result.error.toHttpException();
  }
  return ReservationMapper.toResponseDto(result.value);
}
```

---

## 2. Repository Layer Anti-Patterns

### Rule: Repositories accept and return pure domain aggregates, never ORM entities.

#### ❌ BAD (Leaking ORM Entity to Use Case):

```typescript
async findById(id: number): Promise<InventoryEntity | null> {
  return this.ormRepo.findOne({ where: { id } });
}
```

#### ✅ GOOD (Mapping to Pure Domain Aggregate):

```typescript
async findById(id: number): Promise<Result<Inventory, RepositoryError>> {
  const entity = await this.ormRepo.findOne({ where: { id } });
  if (!entity) {
    return ErrorFactory.RepositoryError('Inventory not found', undefined, HttpStatus.NOT_FOUND);
  }
  return Result.success(InventoryMapper.toDomain(entity));
}
```

---

## 3. Concurrency Anti-Patterns

### Rule: Optimistic locking must use atomic SQL conditional updates.

#### ❌ BAD (Swallowing version mismatch with standard ORM save):

```typescript
async save(inventory: Inventory, expectedVersion?: number): Promise<Result<Inventory, RepositoryError>> {
  const entity = InventoryMapper.toEntity(inventory);
  if (expectedVersion !== undefined) {
    entity.version = expectedVersion; // TypeORM save may overwrite without 409 error
  }
  await this.ormRepo.save(entity);
  return Result.success(inventory);
}
```

#### ✅ GOOD (Explicit atomic SQL conditional update):

```typescript
async save(inventory: Inventory, expectedVersion?: number): Promise<Result<Inventory, RepositoryError>> {
  if (expectedVersion === undefined) {
    const saved = await this.ormRepo.save(InventoryMapper.toEntity(inventory));
    return Result.success(InventoryMapper.toDomain(saved));
  }
  const entity = InventoryMapper.toEntity(inventory);
  const res = await this.ormRepo.createQueryBuilder()
    .update(InventoryEntity)
    .set({
      availableQuantity: entity.availableQuantity,
      reservedQuantity: entity.reservedQuantity,
      lowStockThreshold: entity.lowStockThreshold,
      lastRestockDate: entity.lastRestockDate,
      version: () => 'version + 1',
      updatedAt: () => 'CURRENT_TIMESTAMP',
    })
    .where('id = :id AND version = :expectedVersion', { id: inventory.id, expectedVersion })
    .execute();

  if (res.affected === 0) {
    return ErrorFactory.RepositoryError('Optimistic lock failure', undefined, HttpStatus.CONFLICT);
  }
  const updated = await this.ormRepo.findOneByOrFail({ id: inventory.id! });
  return Result.success(InventoryMapper.toDomain(updated));
}
```

For Product / Order / User / Cart, spread `Mapper.toUpdatePayload(entity)` into `.set()` instead of listing application-owned columns by hand. See [CONVENTIONS.md](CONVENTIONS.md) §4 and §13.

---

## 4. Anti-Patterns Review Checklist

- [ ] Does any domain entity import NestJS `@Injectable()`, TypeORM `@Entity()`, or external libraries?
- [ ] Is a controller publishing domain events directly using `DomainEventPublisher` instead of letting the use case handle it?
- [ ] Is a repository injecting another repository from a different bounded context instead of using an ACL gateway?
- [ ] Is a derived field (e.g. `totalQuantity`) being stored in a database column instead of evaluated via an aggregate getter?
- [ ] Is a background maintenance job executing `OFFSET` pagination instead of ID keyset cursor pagination (`findBatch`)?
