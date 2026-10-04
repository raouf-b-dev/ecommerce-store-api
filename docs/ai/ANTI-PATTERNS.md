# Anti-Patterns and Review Checklist

Applied guide. Bad and good examples for the rules agents break most.

## 1. Fat controller

Bad: business logic and ORM in the controller.

```typescript
@Post('reserve')
async reserveStock(@Body() dto: ReserveStockDto) {
  const inv = await this.inventoryOrmRepo.findOne({ where: { productId: dto.productId } });
  if (inv.availableQuantity < dto.quantity) {
    throw new BadRequestException('Insufficient stock');
  }
  inv.availableQuantity -= dto.quantity;
  return this.inventoryOrmRepo.save(inv);
}
```

Good: permission metadata, then delegate. `ResultInterceptor` maps the `Result` to HTTP.

```typescript
@Post('reserve')
@RequirePermissions('manage_inventory')
async reserveStock(@Body() dto: ReserveStockDto) {
  return await this.reserveStockUseCase.execute(dto);
}
```

## 2. Repository leaks the ORM entity

Bad:

```typescript
async findById(id: number): Promise<InventoryEntity | null> {
  return this.ormRepo.findOne({ where: { id } });
}
```

Good: map to the aggregate and return a `Result`.

```typescript
async findById(id: number): Promise<Result<Inventory, RepositoryError>> {
  const entity = await this.ormRepo.findOne({ where: { id } });
  if (!entity) {
    return ErrorFactory.RepositoryError('Inventory not found', undefined, HttpStatus.NOT_FOUND);
  }
  return Result.success(InventoryMapper.toDomain(entity));
}
```

## 3. Optimistic locking through `save()`

Bad: TypeORM `save()` on a detached entity can overwrite without a version check.

```typescript
entity.version = expectedVersion;
await this.ormRepo.save(entity);
```

Good: one atomic conditional `UPDATE ... WHERE version = :expectedVersion` that returns 409 on zero rows. Rule: [ARCHITECTURE-INVARIANTS.md](ARCHITECTURE-INVARIANTS.md) invariant 10; code: `write-repository` skill.

## 4. Casts to silence the compiler

Bad: the cast hides that the stub does not match the class (AGENTS.md rule 1).

```typescript
const queries = {
  getById: jest.fn(),
} as unknown as jest.Mocked<OrderQueryService>;
```

Good: type the function from the real method, keep the reference, and pass it to `useValue`. `mockResolvedValue` is then checked. More in the `write-tests` skill.

```typescript
const getById: jest.MockedFunction<OrderQueryService['getById']> = jest.fn();
const module = await Test.createTestingModule({
  providers: [
    GetOrderUseCase,
    { provide: OrderQueryService, useValue: { getById } },
  ],
}).compile();
```

## 5. Review checklist

- [ ] Domain imports no NestJS, TypeORM, or external library.
- [ ] Controllers and job handlers hold no logic and do not publish events.
- [ ] No repository or entity imported from another context; gateways used instead.
- [ ] Repositories return domain entities; optimistic locking follows invariant 10.
- [ ] Owned resources check `CallerContext` through `OwnedResourceAccessPolicy`; jobs pass `SYSTEM_CALLER_CONTEXT`.
- [ ] No stored derived field (use an aggregate getter); batch jobs use keyset pagination (`findBatch`), not `OFFSET`.
- [ ] Type rules in AGENTS.md rule 1 hold (no `as`, `any`, `@ts-ignore`, new baseline entries).
- [ ] Tests cover success, failure, and authorization; `npm run verify` is green.
- [ ] Docs updated when a feature ships (`write-docs` skill); an ADR written when a trigger applies.
