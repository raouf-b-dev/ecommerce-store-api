# AI Guidance

Agent instructions are deliberately small. [AGENTS.md](../../AGENTS.md) at the repository root is the single entry point (Claude Code reaches it through `CLAUDE.md`, Gemini CLI through `.gemini/settings.json`). It tells agents which file to load for which task.

| File                                                     | Purpose                                               |
| -------------------------------------------------------- | ----------------------------------------------------- |
| [CONVENTIONS.md](CONVENTIONS.md)                         | Layer, ACL, mapper, job, Redis, type, and error rules |
| [ARCHITECTURE-INVARIANTS.md](ARCHITECTURE-INVARIANTS.md) | Ten non-negotiable architecture rules                 |
| [ANTI-PATTERNS.md](ANTI-PATTERNS.md)                     | Bad and good examples, review checklist               |
| [CODE-MAP.md](CODE-MAP.md)                               | Where modules and shared code live                    |

Task procedures are skills in `.agents/skills/<name>/SKILL.md`: `write-tests`, `add-module`, `add-job`, `write-repository`, `write-docs`, `architecture-boundary-guard`. Skills follow the open [Agent Skills](https://agentskills.io) layout: a folder with a `SKILL.md` whose frontmatter has `name` and a "use when" `description`; extra files under `references/` load on demand.

Human reference docs (data, security, infrastructure, observability, architecture) are indexed in [docs/README.md](../README.md) and are not loaded by agents unless the task is in that area.

Security gate: a change that touches secrets, env configuration, or authentication must follow [SECRETS-MANAGEMENT.md](../security/SECRETS-MANAGEMENT.md) and [JWT-RSA-JWKS.md](../security/JWT-RSA-JWKS.md). Architecture changes follow [DDD-HEXAGONAL.md](../architecture/DDD-HEXAGONAL.md) and [INTEGRATION-PATTERNS.md](../integration/INTEGRATION-PATTERNS.md).

## Maintaining this folder

- Keep `AGENTS.md` under about 60 lines. Move detail into a skill or a doc linked from its table.
- One rule lives in one place. Link instead of copying.
- Rules that a tool can enforce belong in ESLint or `test/architecture`, not in prose.
- Do not add per-tool adapter files (Cursor rules, Copilot instructions, `.windsurfrules`, `GEMINI.md`). Tools read `AGENTS.md`.
