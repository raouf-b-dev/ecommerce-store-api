'use strict';

const { fetchWithTimeout, readJson } = require('./http');

function buildProbes({ baseUrl, timeoutMs, metricsApiKey }) {
  const smokeEmail = `smoke-${Date.now()}@example.com`;
  const smokePassword = 'SmokeTest123!';
  const state = {
    accessToken: null,
    registeredUserId: null,
  };

  return [
    {
      name: 'Liveness Probe (/health/liveness)',
      fn: async () => {
        const res = await fetchWithTimeout(
          `${baseUrl}/health/liveness`,
          {},
          timeoutMs,
        );
        if (res.status !== 200) {
          throw new Error(`Expected HTTP 200, got ${res.status}`);
        }
      },
    },
    {
      name: 'Readiness Probe (/health/readiness)',
      fn: async () => {
        const res = await fetchWithTimeout(
          `${baseUrl}/health/readiness`,
          {},
          timeoutMs,
        );
        if (res.status !== 200) {
          throw new Error(`Expected HTTP 200, got ${res.status}`);
        }
      },
    },
    {
      name: 'Full Health Check (/health)',
      fn: async () => {
        const res = await fetchWithTimeout(`${baseUrl}/health`, {}, timeoutMs);
        if (res.status !== 200) {
          throw new Error(`Expected HTTP 200, got ${res.status}`);
        }
      },
    },
    {
      name: 'Prometheus Metrics Endpoint (/metrics)',
      fn: async () => {
        if (!metricsApiKey) {
          throw new Error('METRICS_API_KEY is not set');
        }
        const res = await fetchWithTimeout(
          `${baseUrl}/metrics`,
          { headers: { 'x-metrics-api-key': metricsApiKey } },
          timeoutMs,
        );
        if (res.status !== 200) {
          throw new Error(`Expected HTTP 200, got ${res.status}`);
        }
        const text = await res.text();
        if (
          !text.includes('process_cpu_user_seconds_total') &&
          !text.includes('http_requests_total')
        ) {
          throw new Error(
            'Response did not contain expected Prometheus metrics',
          );
        }
      },
    },
    {
      name: 'Auth Register + Login (/v1/authentication/*)',
      fn: async () => {
        const registerRes = await fetchWithTimeout(
          `${baseUrl}/v1/authentication/register`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: smokeEmail,
              password: smokePassword,
              firstName: 'Smoke',
              lastName: 'Test',
            }),
          },
          timeoutMs,
        );

        if (registerRes.status !== 201) {
          throw new Error(
            `Register failed with HTTP status ${registerRes.status}`,
          );
        }

        const registerData = await readJson(registerRes);
        state.registeredUserId = registerData.id;
        if (!state.registeredUserId) {
          throw new Error('Register response did not contain user id');
        }

        const loginRes = await fetchWithTimeout(
          `${baseUrl}/v1/authentication/login`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: smokeEmail,
              password: smokePassword,
            }),
          },
          timeoutMs,
        );

        if (loginRes.status !== 200) {
          throw new Error(`Login failed with HTTP status ${loginRes.status}`);
        }

        const data = await readJson(loginRes);
        const token = data.accessToken;
        if (!token) {
          throw new Error('Login response did not contain accessToken');
        }
        state.accessToken = token;
      },
    },
    {
      name: 'Authenticated API Probe (GET /v1/users/:id)',
      fn: async () => {
        if (!state.accessToken) {
          throw new Error(
            'Cannot run authenticated probe because login did not produce an access token',
          );
        }
        if (!state.registeredUserId) {
          throw new Error(
            'Skipping authenticated probe — registered user id missing',
          );
        }

        const res = await fetchWithTimeout(
          `${baseUrl}/v1/users/${state.registeredUserId}`,
          { headers: { Authorization: `Bearer ${state.accessToken}` } },
          timeoutMs,
        );

        if (res.status !== 200) {
          throw new Error(`Expected HTTP 200, got ${res.status}`);
        }
      },
    },
  ];
}

module.exports = { buildProbes };
