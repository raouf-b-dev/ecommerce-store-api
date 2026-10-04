---
name: add-job
description: Add a scheduled, repeatable, or background BullMQ job end to end. Use when creating a job handler, scheduler, cron or repeat job, queue processor case, or retry policy in ecommerce-store-api.
---

# Add a job

Rules: [CONVENTIONS.md](../../../docs/ai/CONVENTIONS.md) section 6. Model it on inventory reconciliation: `InventoryReconciliationJob`, `BullMqInventoryScheduler`, `InventoryProcessor`.

`@Cron()` is process-local, so every instance would run the work. For once-across-instances work use a BullMQ repeatable job.

## Steps

1. Name: add `X: 'kebab-action'` to `src/infrastructure/jobs/job-names.ts`.
2. Retry: add an entry in `src/infrastructure/jobs/job-retry-policies.ts`. The record is keyed by every job name, so typecheck fails until you do.
3. Port: abstract scheduler class in `core/domain/schedulers/<m>.scheduler.ts` (or `core/application/ports/`).
4. Scheduler adapter: `secondary-adapters/schedulers/bullmq-<module>.scheduler.ts` with `@InjectQueue('<queue>')`, implementing the port and `OnModuleInit`, calling `queue.add(name, data, { repeat: { pattern }, jobId })`. Skip when `lifecycle.isShuttingDown`. Return `Result` using `ErrorFactory.InfrastructureError`.
5. Handler: `primary-adapters/jobs/<action>.job.ts`, `@Injectable()`, extends `BaseJobHandler<TData, TResult>`. Declare `protected readonly logger = new Logger(<Class>.name)` (the base requires it), implement `onExecute(job)`, and override `getCorrelationService()` to restore the correlation id. It calls one use case and returns its `Result`. No business logic, no `DomainEventPublisher`. It must be idempotent; background use cases run as `SYSTEM_CALLER_CONTEXT`.
6. Processor: add `case JobNames.X:` to `<m>.processor.ts`, calling `handler.handle(job)`.
7. Module: provide the port bound to the adapter, the handler, and the use case; register the queue with `BullModule.registerQueue`.
8. Audit-style jobs (reconciliation) are read-only: report and emit metrics, never write.
9. Tests: handler and scheduler specs per `write-tests` (golden job spec in its `references/golden-specs.md`).
10. Run `npm run verify`.
