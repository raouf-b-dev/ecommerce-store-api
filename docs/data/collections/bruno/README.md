# Bruno collection

Starter requests for local API exploration. Import this folder into Bruno.

## Environment variables

| Variable      | Example                              |
| :------------ | :----------------------------------- |
| `baseUrl`     | `http://localhost:3000`              |
| `accessToken` | From `POST /v1/authentication/login` |

## Included requests

- `auth/login.bru` - operator login (seed accounts in [SEEDING.md](../../development/SEEDING.md))
- `products/list.bru` - catalog list
- `health/status.bru` - liveness

Payments are mocked behind a swappable adapter until Phase 18.
