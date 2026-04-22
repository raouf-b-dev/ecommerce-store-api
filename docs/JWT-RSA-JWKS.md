# JWT, RSA, and JWKS — Technical Reference

> An academic reference document covering the theory and mechanics of JSON Web Tokens (JWT), RSA asymmetric cryptography, and JSON Web Key Sets (JWKS). Information herein is derived from authoritative RFCs and published standards, **independent of this project's specific implementation**.

---

## 1. JSON Web Token (JWT) — RFC 7519

A **JSON Web Token** is a compact, URL-safe representation of claims to be transferred between two parties. The claims are encoded as a JSON object and can be digitally signed (JWS — RFC 7515) or encrypted (JWE — RFC 7516).

### 1.1 Structure

A signed JWT (JWS Compact Serialization) consists of three Base64url-encoded segments separated by dots:

```
<Header>.<Payload>.<Signature>
```

| Segment       | Contains                                                                                            |
| :------------ | :-------------------------------------------------------------------------------------------------- |
| **Header**    | `alg` (signing algorithm, e.g. `RS256`), `typ` (`JWT`), optionally `kid` (key identifier)           |
| **Payload**   | Claims — both registered (e.g. `iss`, `sub`, `exp`, `iat`) and custom (e.g. `role`, `email`)        |
| **Signature** | `SIGN(base64url(header) + "." + base64url(payload), key)` — the cryptographic proof of authenticity |

### 1.2 Registered Claims (RFC 7519 §4.1)

| Claim | Name       | Description                                                                            |
| :---- | :--------- | :------------------------------------------------------------------------------------- |
| `iss` | Issuer     | Identifies the principal that issued the JWT                                           |
| `sub` | Subject    | Identifies the principal that is the subject (typically a user ID)                     |
| `aud` | Audience   | Identifies the intended recipient(s) of the JWT                                        |
| `exp` | Expiration | The time after which the JWT must be rejected (NumericDate — seconds since Unix epoch) |
| `nbf` | Not Before | The time before which the JWT must not be accepted                                     |
| `iat` | Issued At  | The time at which the JWT was issued                                                   |
| `jti` | JWT ID     | A unique identifier for the JWT — can prevent replay attacks                           |

### 1.3 Signing Algorithms

| Family    | Algorithm | Input                              | Key Type              | Use Case                            |
| :-------- | :-------- | :--------------------------------- | :-------------------- | :---------------------------------- |
| **HMAC**  | `HS256`   | Shared secret                      | Symmetric             | Single-service systems              |
| **RSA**   | `RS256`   | Private key signs, public verifies | Asymmetric (RSA)      | Multi-service / distributed systems |
| **ECDSA** | `ES256`   | Private key signs, public verifies | Asymmetric (EC P-256) | Performance-sensitive systems       |
| **EdDSA** | `EdDSA`   | Private key signs, public verifies | Asymmetric (Ed25519)  | Modern, compact signatures          |

> **Critical distinction**: With HMAC, the same secret signs _and_ verifies — so every service that verifies tokens must possess the secret. With RSA/ECDSA/EdDSA, the private key signs and only the _public_ key is needed for verification. This is foundational for zero-trust microservice architectures.

---

## 2. RSA Cryptography

### 2.1 How RSA Works (Simplified)

RSA (Rivest–Shamir–Adleman, 1977) is an asymmetric cryptosystem based on the mathematical difficulty of factoring the product of two large primes.

**Key generation:**

1. Choose two large primes $p$ and $q$
2. Compute $n = p \times q$ (the modulus — part of both keys)
3. Compute $\phi(n) = (p-1)(q-1)$
4. Choose $e$ such that $1 < e < \phi(n)$ and $\gcd(e, \phi(n)) = 1$ (commonly $e = 65537$)
5. Compute $d = e^{-1} \mod \phi(n)$ (the private exponent)

**Result:**

- **Public key**: $(n, e)$ — shared freely
- **Private key**: $(n, d)$ — kept secret; PEM format encodes $n$, $e$, $d$, $p$, $q$, $dp$, $dq$, $qi$

### 2.2 RSA in JWT Context (RS256)

`RS256` means "RSA Signature with SHA-256". The signing process is:

1. **Signing** (done by the issuer, requires private key):
   - Compute: `SHA-256(base64url(header) + "." + base64url(payload))`
   - Sign the hash with the RSA private key: `signature = hash^d mod n`

2. **Verification** (done by any relying party, requires only public key):
   - Compute: `SHA-256(base64url(header) + "." + base64url(payload))`
   - Verify: `signature^e mod n == hash`

> **Security implication**: The private key never leaves the signing service. Verification services only need the public key — which can be distributed freely via JWKS.

### 2.3 PEM Format

Private keys are typically stored in PEM (Privacy-Enhanced Mail) format:

```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...
(Base64-encoded DER/ASN.1 structure containing n, e, d, p, q, dp, dq, qi)
-----END PRIVATE KEY-----
```

For `RS256` JWT signing, this PEM is parsed at runtime using PKCS#8 import functions (e.g., `jose.importPKCS8()`).

### 2.4 Recommended Key Size

| Key Size | Security Level | Status (NIST SP 800-57)                       |
| :------- | :------------- | :-------------------------------------------- |
| 1024-bit | ~80-bit        | **Deprecated** since 2013. Do not use.        |
| 2048-bit | ~112-bit       | Acceptable through 2030. Minimum recommended. |
| 3072-bit | ~128-bit       | Recommended for post-2030 deployments.        |
| 4096-bit | ~140-bit+      | High security. Performance cost is minimal.   |

---

## 3. JSON Web Key and JWKS — RFC 7517

### 3.1 What is a JWK?

A **JSON Web Key (JWK)** is a JSON object that represents a cryptographic key. For RSA, the public key JWK contains:

```json
{
  "kty": "RSA",
  "use": "sig",
  "alg": "RS256",
  "kid": "2024-04-21-primary",
  "n": "<Base64url-encoded RSA modulus>",
  "e": "<Base64url-encoded RSA public exponent>"
}
```

| Field | Description                                       | Required     |
| :---- | :------------------------------------------------ | :----------- |
| `kty` | Key Type — `RSA`, `EC`, `OKP`, `oct`              | ✅ Yes       |
| `use` | Key Usage — `sig` (signing) or `enc` (encryption) | Optional     |
| `alg` | Algorithm intended for use with this key          | Optional     |
| `kid` | Key ID — a unique identifier for key selection    | Optional     |
| `n`   | RSA modulus (Base64url-encoded)                   | ✅ Yes (RSA) |
| `e`   | RSA public exponent (Base64url-encoded)           | ✅ Yes (RSA) |

> **Important**: A public JWK must never contain private parameters (`d`, `p`, `q`, `dp`, `dq`, `qi`). If these are present, you have leaked your private key.

### 3.2 What is a JWKS?

A **JSON Web Key Set** is simply a JSON object with a `keys` array containing one or more JWKs:

```json
{
  "keys": [
    { "kty": "RSA", "kid": "key-2024", "n": "...", "e": "..." },
    { "kty": "RSA", "kid": "key-2023-retired", "n": "...", "e": "..." }
  ]
}
```

### 3.3 The JWKS Endpoint

The JWKS is served at a well-known URL (typically `/.well-known/jwks.json`) so that any relying party can discover the public keys dynamically. This is foundational to OpenID Connect (OIDC) and OAuth 2.0 Authorization Servers.

**Verification flow:**

1. Relying party receives a JWT with header `{ "kid": "key-2024", "alg": "RS256" }`
2. Relying party fetches `https://issuer.example/.well-known/jwks.json`
3. Relying party finds the JWK with matching `kid`
4. Relying party uses that JWK's public key to verify the signature

### 3.4 Key ID (`kid`) Best Practices — RFC 7638

The `kid` parameter is an **opaque, case-sensitive string** used to select the correct key from a JWKS. Its value is application-specific, but best practices include:

| Strategy                | Description                                                             | Pros / Cons                                                              |
| :---------------------- | :---------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| **RFC 7638 Thumbprint** | SHA-256 hash of the canonicalized JWK members (`e`, `kty`, `n` for RSA) | Deterministic, collision-resistant, industry standard. Slightly complex. |
| **Date-based**          | e.g. `2024-04-21-primary`                                               | Human-readable, easy to manage. Risk of collision on fast rotation.      |
| **Incremental**         | e.g. `1`, `2`, `3`                                                      | Simple. Not portable across systems. Not recommended for production.     |
| **UUID**                | e.g. `550e8400-e29b-41d4-a716-446655440000`                             | Unique. Non-deterministic — harder to correlate across services.         |

> **Recommendation**: Use **RFC 7638 thumbprints** for production systems. The thumbprint is derived directly from the key material, making it deterministic and globally unique without coordination.

### 3.5 Key Rotation

Key rotation is the process of introducing a new signing key and retiring the old one. The JWKS makes this seamless:

1. **Generate** a new RSA key pair with a new `kid`
2. **Add** the new public key to the JWKS (the set now has two keys)
3. **Switch** the signer to use the new private key
4. **Keep** the old public key in the JWKS until all tokens signed by it have expired
5. **Remove** the old key from the JWKS

> During rotation, the JWKS temporarily contains multiple keys. The `kid` in the JWT header tells the verifier which key to use.

---

## 4. Access Tokens and Refresh Tokens

### 4.1 The Dual-Token Architecture

Modern authentication systems use two distinct tokens:

| Property       | Access Token                             | Refresh Token                                        |
| :------------- | :--------------------------------------- | :--------------------------------------------------- |
| **Purpose**    | Authorize API requests                   | Obtain new access tokens without re-authentication   |
| **Lifetime**   | Short (5–15 minutes)                     | Long (hours to days)                                 |
| **Storage**    | Application memory (JavaScript variable) | HttpOnly + Secure + SameSite cookie                  |
| **Sent via**   | `Authorization: Bearer <token>` header   | Automatically via cookie on `/auth/refresh` requests |
| **Payload**    | User identity, role, permissions         | Minimal — user ID + session ID                       |
| **Stateless?** | Yes — verified via signature only        | No — validated against server-side session store     |
| **Revocable?** | Not immediately (expires naturally)      | Yes — server revokes the session record              |

### 4.2 Why Two Tokens?

The access token is **stateless** — the server never needs to check a database to validate it. This is fast and scalable. However, statelessness means the server cannot revoke it once issued.

The refresh token bridges this gap. It is **stateful** — the server checks a session record in the database before issuing a new access token. This provides a revocation checkpoint without sacrificing the performance benefits of stateless access tokens.

### 4.3 Refresh Token Rotation (RFC 6749 §10.4)

**Rotation** means that every time a client uses a refresh token, the server:

1. **Validates** the refresh token (signature + session record)
2. **Revokes** the used refresh token
3. **Issues** a brand-new refresh token (and a new access token)
4. **Returns** the new pair

This limits the window of opportunity for a stolen refresh token. If an attacker uses a stolen token, the legitimate user's next refresh attempt will fail (because the token was already consumed), alerting the system to potential compromise.

**Reuse detection**: If a revoked refresh token is presented again, this is a strong signal of token theft. Best practice is to revoke **all sessions** for that user (a "forced logout everywhere").

### 4.4 Refresh Token Transport — OWASP Best Practice

> **OWASP and industry consensus**: Refresh tokens should be transported via **HttpOnly, Secure, SameSite cookies** — never in the JSON response body for browser-based clients.

| Cookie Attribute | Value      | Purpose                                                    |
| :--------------- | :--------- | :--------------------------------------------------------- |
| `HttpOnly`       | `true`     | Prevents JavaScript access — mitigates XSS token theft     |
| `Secure`         | `true`     | Cookie only sent over HTTPS                                |
| `SameSite`       | `Strict`   | Prevents CSRF by blocking cross-origin cookie transmission |
| `Path`           | `/auth`    | Cookie only sent to auth endpoints — minimizes exposure    |
| `Max-Age`        | TTL in sec | Matches the refresh token's server-side expiration         |

**Why not the response body?**

If the refresh token is returned in the JSON body, the client-side JavaScript must receive it, store it (in memory, localStorage, or sessionStorage), and attach it to future requests. This exposes the token to:

- **XSS attacks**: Any injected script can read the token from JavaScript-accessible storage
- **Accidental logging**: Network interceptors, browser extensions, or error reporting tools may capture the response body

With HttpOnly cookies, the browser handles storage and transmission automatically. JavaScript **cannot** read the cookie, completely eliminating XSS-based token theft.

> **API-only backends** (mobile apps, server-to-server): Returning the refresh token in the body is acceptable because these clients are not vulnerable to XSS. The defense above specifically applies to **browser-based** clients.

---

## 5. The Complete Authentication Flow

```
┌──────────┐                       ┌──────────────────┐                    ┌──────────┐
│  Client  │                       │   Auth Server    │                    │ Database │
│ (Browser)│                       │                  │                    │          │
└────┬─────┘                       └────────┬─────────┘                    └────┬─────┘
     │                                      │                                   │
     │  1. POST /auth/login {email, pass}   │                                   │
     │─────────────────────────────────────►│                                   │
     │                                      │ 2. Verify credentials              │
     │                                      │──────────────────────────────────►│
     │                                      │◄──────────────────────────────────│
     │                                      │ 3. Sign access token (RS256)      │
     │                                      │ 4. Sign refresh token (RS256)     │
     │                                      │ 5. Store session (SHA-256 hash)   │
     │                                      │──────────────────────────────────►│
     │                                      │◄──────────────────────────────────│
     │  6. Response:                        │                                   │
     │     Body: { access_token }           │                                   │
     │     Cookie: refresh_token (HttpOnly) │                                   │
     │◄─────────────────────────────────────│                                   │
     │                                      │                                   │
     │  7. GET /api/resource                │                                   │
     │     Authorization: Bearer <access>   │                                   │
     │─────────────────────────────────────►│                                   │
     │                                      │ 8. Verify signature (public key)  │
     │  9. 200 OK { data }                  │    No DB lookup needed!           │
     │◄─────────────────────────────────────│                                   │
     │                                      │                                   │
     │  — access token expires —            │                                   │
     │                                      │                                   │
     │  10. POST /auth/refresh              │                                   │
     │      Cookie: refresh_token (auto)    │                                   │
     │─────────────────────────────────────►│                                   │
     │                                      │ 11. Verify refresh JWT            │
     │                                      │ 12. Check session in DB           │
     │                                      │──────────────────────────────────►│
     │                                      │◄──────────────────────────────────│
     │                                      │ 13. Revoke old, create new session│
     │                                      │──────────────────────────────────►│
     │  14. New access + refresh tokens     │                                   │
     │◄─────────────────────────────────────│                                   │
```

---

## 6. Security Considerations

### 6.1 Token Theft Mitigation

| Threat               | Mitigation                                                           |
| :------------------- | :------------------------------------------------------------------- |
| XSS steals tokens    | HttpOnly cookies for refresh; access token in memory only            |
| CSRF on cookie       | `SameSite=Strict`, scope cookie `Path=/auth`                         |
| Stolen refresh token | Rotation + reuse detection → revoke all sessions on reuse            |
| Man-in-the-middle    | `Secure` flag, HTTPS everywhere, HSTS headers                        |
| Token replay         | Short `exp` on access tokens, `jti` for additional replay prevention |
| Key compromise       | Key rotation via JWKS, revoke all tokens signed by compromised key   |

### 6.2 Clock Tolerance

JWTs are time-sensitive (`exp`, `nbf`, `iat`). Network latency and clock skew between distributed systems can cause valid tokens to be rejected. A **clock tolerance** (typically 30-60 seconds) should be applied during verification.

### 6.3 Audience Validation

For multi-tenant or multi-service deployments, always set and verify the `aud` claim to prevent tokens issued for one service from being accepted by another.

---

## References

| RFC / Standard     | Title                                                 |
| :----------------- | :---------------------------------------------------- |
| **RFC 7519**       | JSON Web Token (JWT)                                  |
| **RFC 7515**       | JSON Web Signature (JWS)                              |
| **RFC 7516**       | JSON Web Encryption (JWE)                             |
| **RFC 7517**       | JSON Web Key (JWK)                                    |
| **RFC 7518**       | JSON Web Algorithms (JWA)                             |
| **RFC 7638**       | JSON Web Key (JWK) Thumbprint                         |
| **RFC 6749**       | The OAuth 2.0 Authorization Framework                 |
| **NIST SP 800-57** | Recommendation for Key Management                     |
| **OWASP**          | Cheat Sheet Series — Session Management, JWT Security |
