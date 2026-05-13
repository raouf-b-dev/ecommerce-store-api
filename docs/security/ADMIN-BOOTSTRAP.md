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

## 5. Implementation — `mustChangePassword` Property

The `User` domain entity implements a `mustChangePassword` boolean flag:

- **Bootstrap Flow:** The seeder creates the super-admin with `mustChangePassword: true`.
- **Change Flow:** The `User.changePassword()` method automatically sets `mustChangePassword = false` as a domain invariant.

## 6. Login Response Contract

When a user authenticates successfully via `/auth/login`, the response body explicitly includes the `mustChangePassword` flag:

- `mustChangePassword: true` → The frontend must immediately route the user to a mandatory password-change form. No other API actions are permitted.
- `mustChangePassword: false` → The frontend proceeds to the dashboard.

## 7. Implementation Checklist

When testing or building the bootstrap flow:

1. Initialize the system data (roles, permissions).
2. Run `npm run seed:admin` locally.
3. Authenticate to receive `mustChangePassword: true`.
4. Submit a password change request.
5. Verify `mustChangePassword` is cleared and access is granted.
