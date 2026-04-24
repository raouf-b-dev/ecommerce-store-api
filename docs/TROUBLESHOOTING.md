# 🛠️ Troubleshooting

> Common issues and solutions for the E-Commerce Store API.

---

## Docker Services Won't Start

**Symptom**: `EADDRINUSE` or containers fail to bind ports.

```bash
# Check if ports are in use
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Reset Docker environment
npm run d:reset:dev
```

---

## Migration Errors

**Symptom**: TypeORM migration fails or schema is out of sync.

```bash
# Ensure database is running
npm run d:up:dev

# Check connection with migration status
npm run migration:show:dev

# Reset database if needed (⚠️ DATA LOSS)
npm run d:reset:dev
npm run migration:run:dev
```

---

## Test Failures

**Symptom**: Tests fail with connection errors or open handles.

```bash
# Run tests in isolation
npm run test:ci

# Check for open handles
npm run test -- --detectOpenHandles

# Ensure test database is clean
npm run d:reset:test
```

---

## Environment Issues

- Verify all required environment variables are set
- Check `.env.example` for the complete list of required keys
- Ensure Docker services are healthy before running the application
- Use `npm run env:init` to regenerate environment files from templates

---

## Port Conflicts (EADDRINUSE)

**Symptom**: API crashes on startup with `EADDRINUSE`.

The API includes bootstrap-level protection against port conflicts. If you see this error:

1. Find and kill the process using the port: `lsof -i :3000`
2. Or change the `PORT` value in your `.env.*` file
3. The API will log the conflict and exit with a non-zero code — it won't crash-loop silently
