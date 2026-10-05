---
name: check-side-effects
description: Make code that leaves the database (enqueue a job, call a gateway or payment, send a notification, emit an event) safe against crashes and retries. Use when a change adds or moves a queue add, gateway call, refund or payment, notification, or domain event, or sets a retry policy in ecommerce-store-api.
---

# Check side effects

A process can die between any two lines, and queues and callers retry. Every side effect must survive both. Rules: [CONVENTIONS.md](../../../docs/ai/CONVENTIONS.md) sections 6 (jobs) and 14 (errors). Model it on refund on cancel: `CancelOrderUseCase`, `ProcessRefundUseCase`.

A side effect is anything that leaves the database: a `queue.add`, a gateway or HTTP call, a notification, a domain event. A single database write is not one: it either commits or rolls back.

## Steps

1. List every side effect in the diff. Next to each, write one sentence: "if the process dies right after this, then ...". If the answer is money or stock lost or doubled, fix the order before going on. Put this list in your final message.
2. Persist first, then fire. Save the state that records the intent (`CANCELLED`, refund pending) before the side effect, so a crash leaves a row a retry can find. Firing first and saving after means a crash loses the effect or repeats it with no record.
3. Make a repeat harmless. Build the key from business ids, never a timestamp or random value: `jobId: 'refund-payment-order-<orderId>'`. BullMQ ignores a second add with the same `jobId`. Give gateway calls the same kind of idempotency key. Running the use case twice must cause one effect.
4. Carry the retryable flag. Set it where the error is created (`ErrorFactory`), keep it when you wrap the error (`UseCaseError`, the gateway, `ProcessRefundUseCase`), and check that the job (`job-retry-policies.ts`) or the caller really retries on it. Queue and network errors are retryable; validation and business-rule errors are not. A wrapper that drops the flag turns a retry into a permanent failure.
5. Fail loudly. If the effect cannot be fired, return the failure so the caller or job retries. Never log and return success, and never default a missing value (`total || 0`): reject it.
6. Test it by failure injection (golden spec "Failure injection" in `write-tests`): the effect succeeds and the next step fails, or the effect itself fails. Assert the state a retry needs is saved, the error is retryable, and a second run leaves exactly one effect.
7. Keep the tests honest: no `expect` inside `if`, `try`, `catch`, or a ternary (`write-tests` rule 4). If you copied a block twice, extract it before the PR.
8. Run `npm run verify`.
