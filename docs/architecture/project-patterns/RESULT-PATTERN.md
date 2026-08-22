# Project Pattern: Result Monad & Error Handling

This document defines how explicit error handling is implemented across `ecommerce-store-api` using the `Result<T, E>` monad pattern.

---

## 1. Architectural Motivation

Instead of throwing uncaught runtime exceptions across application boundaries, `ecommerce-store-api` uses explicit functional error handling:

- **`Result.success<T>(value)`**: Encapsulates successful computation.
- **`Result.failure<E>(error)`**: Encapsulates explicit domain or infrastructure errors (`AppError`, `DomainError`, `RepositoryError`).

---

## 2. Usage Conventions

### Use Cases & Repositories

Use cases and repositories return `Promise<Result<T, AppError>>`:

```typescript
const result = await this.inventoryRepo.findById(id);

if (result.isFailure) {
  return Result.failure(result.error);
}

const inventory = result.value;
```

### Primary Controllers & Thin Controller Rule

Controllers unwrap `Result` objects using shared kernel error utilities or direct HTTP mapping, returning DTOs or throwing standard NestJS HTTP exceptions (`HttpException`, `NotFoundException`, `ConflictException`) at the API boundary:

```typescript
@Get(':id')
async findOne(@Param('id', ParseIntPipe) id: number): Promise<InventoryResponseDto> {
  const result = await this.getInventoryUseCase.execute(id);
  if (result.isFailure) {
    throw result.error.toHttpException();
  }
  return InventoryMapper.toResponseDto(result.value);
}
```
