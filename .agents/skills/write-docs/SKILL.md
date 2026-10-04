---
name: write-docs
description: Create, move, or update documentation, ADRs, and project-state docs. Use when adding or editing anything under docs/, writing an ADR, updating FEATURES.md or ROADMAP.md after a feature ships, fixing doc links, or deciding where a doc belongs.
---

# Write docs

ASCII rule: AGENTS.md rule 2 (`npm run lint:check` enforces it; `docs/architecture/adr/` is immutable and exempt).

## Pick the type first

Every doc is Reference, Applied, or Hybrid. Put the type in the header, decide it before choosing a folder.

- **Reference**: timeless theory, portable to any project. The opening paragraph says it is project-agnostic. No project names, modules, controller lists, env vars, "current state" sections, or links to sibling project docs (`ROADMAP.md`, `ARCHITECTURE.md`). Every significant claim cites a trusted source (book with ISBN, RFC, official docs, standard); never cite an uncertain chapter or unverifiable source. Framework code (NestJS, Express) may illustrate, presented as an example of the pattern. Include an anti-patterns table, the reason this approach beat the alternatives, and end with `## References`.
- **Applied**: how this project does it: runbooks, config, policy. May name modules, controllers, env vars, Docker commands. Link to the Reference doc for theory. Top half: timeless policy and rationale; bottom half: current implementation appendix. Runbooks use symptom, diagnosis, fix. Project state (controller inventories, progress) lives in `FEATURES.md`, `ROADMAP.md`, or a README, never in a Reference doc.
- **Hybrid**: a Reference body that stands alone, plus a clearly separate project section under its own `##` heading with no project details in the reference part.

| Type      | Current docs                                                                                                                                                                                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reference | `architecture/` DDD-HEXAGONAL, CQRS, API-VERSIONING, RATE-LIMITING; `data/` DATA-NORMALIZATION, EAV-PATTERN; `security/` JWT-RSA-JWKS; `integration/` INTEGRATION-PATTERNS; `observability/` foundation and pillar docs; `infrastructure/` PROCESS-LIFECYCLE (sections 1-6, hybrid) |
| Applied   | `architecture/` ARCHITECTURE; `security/` SECRETS-MANAGEMENT, SECRET-ROTATION, ADMIN-BOOTSTRAP; `infrastructure/` TROUBLESHOOTING, PROCESS-LIFECYCLE (section 7); `testing/` TESTING-TASK-TEMPLATE, INTEGRATION-TESTING-GUIDE; `docs/` FEATURES, ROADMAP, README                    |

## Place and name

- `docs/architecture/` principles, `domains/`, `project-patterns/`, `adr/`. `docs/database/` schema, transactions, indexes. `docs/decision-guides/` files named `WHEN-TO-*.md`. `docs/data/` theory (`concurrency/`, `consistency/`, `performance/`). `docs/infrastructure/` deployment, CI/CD, runbooks. Also `security/`, `observability/`, `testing/`, `integration/`.
- Uppercase kebab-case filenames. Code patterns end in `-PATTERN.md`. ADRs are `ADR-XXXX-short-title.md` with 4 digits.
- Folders that have a `README.md` keep it current (what belongs, what does not, reading order).
- Add every new doc to [docs/README.md](../../../docs/README.md).

## When a feature ships

1. Update `docs/FEATURES.md` (edit the entry or add one).
2. Mark the task `[x]` in `docs/ROADMAP.md`. Use `rg` to find the phase; do not read the whole file.
3. Update `ADMIN-BOOTSTRAP.md` if auth or bootstrap changes; `ARCHITECTURE.md` if context relationships change.
4. Update [CODE-MAP.md](../../../docs/ai/CODE-MAP.md) when a module, gateway, or infrastructure component is added or removed.

## ADR triggers

Write `docs/architecture/adr/ADR-XXXX-title.md` when a change: overrides a transaction isolation level, adds or removes a denormalized field, creates or splits a bounded context, adds a broker, lock manager, or event stream, or switches between strong and eventual consistency. States: `Proposed`, `Accepted`, `Deprecated`, `Superseded` (link the new ADR). Never edit an accepted ADR body.

## Check

Links resolve, headings match the index, no deleted file is still linked (`rg '<old-name>' docs README.md CONTRIBUTING.md`), then `npm run lint:check`.
