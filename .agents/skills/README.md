# Shared Skills Scaffold

Single source of truth for skill content:

- `.agents/skills/*`

Do not edit mirrored skills directly in:

- `.claude/skills/*`
- `.github/skills/*`

Sync after updates:

```bash
npm run skills:sync
```

Check drift in CI/local:

```bash
npm run skills:check
```
