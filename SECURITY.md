# Security Policy

## Supported Versions

| Version | Supported              |
| ------- | ---------------------- |
| 0.2.x   | ✅ Active              |
| < 0.2   | ❌ No longer supported |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability, please report it responsibly:

1. **Email**: Send details to [rbdz@hotmail.fr](mailto:rbdz@hotmail.fr)
2. **Subject**: `[SECURITY] ecommerce-store-api — Brief description`
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Fix or mitigation**: Dependent on severity

## Security Practices

This project implements the following security measures:

### Authentication & Authorization

- JWT-based authentication with secure token handling
- Passwords hashed with `bcrypt` (cost factor 10+)
- Environment-based secret management (`.secrets` file, git-ignored)

### Input Validation

- `class-validator` decorators on all DTOs
- `whitelist: true` and `forbidNonWhitelisted: true` in global `ValidationPipe`
- TypeORM parameterized queries (SQL injection prevention)

### Infrastructure

- Redis-backed idempotency protection on critical endpoints
- Environment variable validation via `envalid` at startup
- Docker Compose for isolated local development

### Sensitive Files

The following files contain secrets and are **git-ignored**:

| File       | Purpose                     |
| ---------- | --------------------------- |
| `.secrets` | Runtime secrets (JWT keys)  |
| `.env.*`   | Environment-specific config |

> **Contributors**: Never commit secrets, API keys, or credentials. Use `.secrets.example` and `.env.example` as templates.

## Dependency Management

- Dependencies are regularly audited with `npm audit`
- Dependabot alerts are enabled on the repository
- Security patches are prioritized in all releases
