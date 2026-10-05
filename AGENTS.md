# ecommerce-store-api

NestJS 11 modular monolith (DDD + Hexagonal), TypeScript, PostgreSQL (TypeORM), Redis Stack, BullMQ, Socket.io. Node 24+.

## Verify

`npm run verify` runs typecheck, lint (ESLint + ASCII prose), format check, architecture tests, and unit tests. Run it before reporting a task done. One spec: `npx jest <path>`.

In your final message give: what changed, the commands you ran with results, open risks or assumptions, and for each side effect in the diff (queue add, gateway call, notification, event) what happens if the process dies right after it.

## Never

1. Use `as` assertions (except `as const`), `any`, or `@ts-ignore`. Use `unknown`, type guards, and `satisfies`; in tests use `Mock*` classes and `jest.MockedFunction` stubs. `eslint-suppressions.json` is a frozen baseline of older violations: never add entries; after fixing one run `npm run lint:prune`. `!` non-null assertions are not lint-enforced and legacy code has them: do not add new ones, narrow instead.
2. Write em or en dashes, curly quotes, or the ellipsis character in code, comments, or docs. Use ASCII (`-`, `'`, `"`, `...`).
3. Import NestJS, TypeORM, or infrastructure into `core/domain`. Dependencies point inward; adapters implement ports.
4. Reach into another module's repository or entity. Cross-module calls go through ACL gateway ports.
5. Put logic in controllers or job handlers. They extract input, call one use case, return its result. Only use cases emit domain events.
6. Throw from domain or application code. Return `Result<T, E>` built with `ErrorFactory`.
7. Stringify unknown errors by hand. Use `toError`, `toErrorMessage`, `toOptionalError` from `src/shared-kernel/infra/lang/error.utils.ts`.
8. Put `version` on a domain entity or cache it, or update without the atomic `WHERE version = :expectedVersion` check. Rule: `docs/ai/ARCHITECTURE-INVARIANTS.md` invariant 10.
9. Skip authorization on owned resources. Use cases take `CallerContext` and use `OwnedResourceAccessPolicy`; jobs and gateways pass `SYSTEM_CALLER_CONTEXT`.
10. Ship a behavior change without co-located `*.spec.ts` covering success, failure, and authorization paths.
11. Run without explicit user approval: `git push`, `npm publish`, `migration:run` or `migration:revert`, `rm -rf` or bulk deletes, or anything that changes production config. Never edit an applied migration.

Stop and ask when a security or data-integrity decision is ambiguous.

## Architecture invariants

Pure domain; persistence-ignorant aggregates; repositories return domain entities only; thin primary adapters; ACL gateways or domain events between contexts; one aggregate per transaction; normalized schemas by default; reconciliation jobs are read-only; explicit optimistic concurrency. Details: `docs/ai/ARCHITECTURE-INVARIANTS.md`.

## PR review findings

Mistakes that cost QA rounds. Check your diff for each before you report done.

- A side effect fires before the state it depends on is saved, or its key is random or time-based: `check-side-effects` skill.
- The retryable flag is dropped when an error is wrapped (`ErrorFactory`, `UseCaseError`, gateways, use cases), or no test covers it.
- `expect` sits inside `if`, `try`, `catch`, or a ternary: the test passes when the branch is skipped. ESLint rejects it.
- The same block is pasted twice: extract it before the PR.

## Load only when

Skills are folders `.agents/skills/<name>/SKILL.md`. Open the file when its row applies, even if your tool does not discover skills itself.

| When you are                                                  | Load                                                                   |
| ------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Writing or fixing tests                                       | `.agents/skills/write-tests/SKILL.md`                                  |
| Adding a module, use case, endpoint, gateway, or permission   | `.agents/skills/add-module/SKILL.md`                                   |
| Adding a scheduled or background job                          | `.agents/skills/add-job/SKILL.md`                                      |
| Adding or changing a queue add, gateway call, or domain event | `.agents/skills/check-side-effects/SKILL.md`                           |
| Changing a repository, mapper, ORM entity, or versioned write | `.agents/skills/write-repository/SKILL.md`                             |
| Writing or moving docs, ADRs, FEATURES or ROADMAP entries     | `.agents/skills/write-docs/SKILL.md`                                   |
| Reviewing a change for layer, ACL, or authorization drift     | `.agents/skills/architecture-boundary-guard/SKILL.md`                  |
| Needing layer, ACL, mapper, job, Redis, or error rules        | `docs/ai/CONVENTIONS.md`                                               |
| Touching secrets, env vars, JWT keys, or auth flows           | `docs/security/SECRETS-MANAGEMENT.md`, `docs/security/JWT-RSA-JWKS.md` |
| Reviewing against known bad patterns                          | `docs/ai/ANTI-PATTERNS.md`                                             |
| Looking for where something lives                             | `docs/ai/CODE-MAP.md`                                                  |
| Working in one area (data, security, infra, observability)    | the single matching doc via `docs/README.md`                           |

`docs/` deep dives are human reference docs: never load a whole folder. Never load `docs/ROADMAP.md`, `docs/ROADMAP-CHANGELOG.md`, or `docs/FEATURES.md` in full; `rg` for the phase or feature.
