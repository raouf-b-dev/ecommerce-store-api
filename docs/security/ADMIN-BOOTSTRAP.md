# Admin Bootstrap Security Posture

## Overview

Bootstrapping a brand new SaaS platform requires creating an initial "Super Admin" user. This presents a classic "chicken-and-egg" security problem: how do you create a privileged account when no authentication mechanism yet exists to authorize the creation?

The E-commerce API addresses this using a **Dual-Mechanism Bootstrap strategy**.

## Mechanism 1: Interactive CLI (Local Development)

For local development, an interactive CLI script (`npm run seed:admin`) is provided.

**Security properties:**

- **Zero footprint:** Credentials are never written to disk or `.env` files.
- **Interactive:** Prompts the developer in real-time.
- **Idempotent:** Halts safely if an admin already exists.

## Mechanism 2: Environment Variable Seeder (Docker / CI / Cloud)

For automated environments, the `SuperAdminSeederInitializer` runs on application boot.

**Security properties:**

- **Ephemeral configuration:** Reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the environment.
- **Safe defaults:** Skips execution if variables are absent.
- **Idempotent:** Creates the user once and ignores subsequent boots if the user exists.

## Defense-in-Depth: Forced Credential Rotation

The primary risk of Mechanism 2 is that `ADMIN_PASSWORD` might be accidentally committed to a repository or left in a long-lived `.env` file.

To mitigate this, the system should enforce **Forced Credential Rotation**:

1. The bootstrap credential is treated as temporary and high-risk.
2. The login flow should explicitly signal that rotation is required.
3. The frontend should force a password-change path before normal operations.
4. The user should not proceed until the credential is rotated through the API password-change flow.

## Academic & Industry Alignment

This approach aligns with global security standards and industry best practices:

### 1. NIST SP 800-63B (Digital Identity Guidelines)

NIST requires that authenticator secrets (like passwords) must be established over a secure channel. By treating the env-var password as a **temporary setup token**, the system complies with Section 5.1.1.2 regarding the forced rotation of temporary authenticators before full access is granted.

### 2. OWASP ASVS v4.0 (Application Security Verification Standard)

- **V2.1.1:** "Verify that all user passwords are changed from their default values..." A forced-rotation flow enforces this automatically.
- **V2.1.4:** "Verify that temporary credentials and initial passwords are changed on first use."

### 3. CIS Controls v8

- **Control 5.2:** "Use Unique Passwords... Ensure that default passwords are changed."
- **Control 5.3:** "Disable Dormant Accounts." If the bootstrap credentials leak, but the admin hasn't logged in, the temporary password forces a rotation. If the admin _has_ logged in, the leaked temporary password is automatically invalid because the password was changed.

### 4. Industry Precedent

This dual-seeder + forced rotation pattern is standard across enterprise SaaS:

- **Keycloak:** Uses `KEYCLOAK_ADMIN` env vars for bootstrap.
- **Grafana:** Uses `GF_SECURITY_ADMIN_PASSWORD` and forces a change on first login.
- **GitLab:** Uses `GITLAB_ROOT_PASSWORD` for initial setup.

## 5. Implementation: `mustChangePassword` on Credential

The flag lives on the `Credential` entity (not `User`):

- **Bootstrap / seed flow:** Demo and super-admin seeds create credentials with `mustChangePassword: true`.
- **Change flow:** `Credential.changePassword()` sets a new hash and clears the flag.
- **Session hardening:** `ChangePasswordUseCase` revokes all refresh sessions, then mints a new token pair.

## 6. Login and refresh response contract

Successful `POST /v1/authentication/login` and `POST /v1/authentication/refresh` include `mustChangePassword`:

- `true` → clients route to mandatory password change; domain routes return 403 (`MUST_CHANGE_PASSWORD`) except the auth allowlist.
- `false` → normal access.

Allowlist while the flag is set: `change-password`, `logout`, `logout-all`, `refresh`.

### How the gate resolves the flag

`signAccessToken` embeds a `mustChangePassword` claim **only** when the credential is flagged at issue time, so an ordinary token carries no claim at all. `MustChangePasswordGuard` reads that claim first and returns immediately when it is absent, which keeps the common request path free of database work. When the claim is present the guard loads the credential and **fails closed**: domain access is allowed only when the database positively confirms `mustChangePassword === false`. Lookup failures, missing credentials, or a flag still set all return HTTP 403 (`MUST_CHANGE_PASSWORD`). Users with a flagged token can still reach `@AllowDuringPasswordChange()` routes (`change-password`, `refresh`, `logout`, `logout-all`).

The deliberate trade-off: flipping `must_change_password` to `true` out of band does not affect tokens already in circulation. Those keep working until they expire (`JWT_ACCESS_TOKEN_TTL`, 15m by default), and the next `/refresh` re-reads the credential and mints a token carrying the claim. Revoking refresh sessions alone would not close that window either, since it does not invalidate issued access tokens. If an immediate cut-off is ever required, that needs a per-request revocation check rather than a change to this guard.

## 7. Change-password endpoint

`POST /v1/authentication/change-password` (authenticated):

- Validates current password and `@MinLength(6)` on the new password.
- Returns new `accessToken`, `refreshToken`, and `mustChangePassword: false`.

## 8. Implementation checklist

When testing the bootstrap flow:

1. Initialize system data (roles, permissions) and seed demo accounts ([`SEEDING.md`](../development/SEEDING.md)).
2. Log in and confirm `mustChangePassword: true` in the response.
3. Confirm a domain route (for example `GET /v1/users/:id`) returns 403 with `MUST_CHANGE_PASSWORD`.
4. Submit change-password with current and new passwords.
5. Confirm the flag is false, domain routes succeed, and the previous refresh token no longer works.
