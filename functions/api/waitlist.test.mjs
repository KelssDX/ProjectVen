import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequestGet, onRequestPost } from '../../dist/functions-test/api/waitlist.js';

const validSubmission = {
  fullName: '  Ada Founder  ',
  email: ' ADA@EXAMPLE.COM ',
  role: 'entrepreneur',
  organisation: 'Vendrome Labs',
  country: 'South Africa',
  interest: 'networking',
  profileUrl: 'https://example.com/ada',
  note: 'Building trusted business communities.',
  company: '',
  consent: true,
  turnstileToken: 'test-token',
};

function createRequest(payload = validSubmission, origin = 'https://vendrome.com', ipCountry = 'GB') {
  const headers = {
    'Content-Type': 'application/json',
    Origin: origin,
  };
  if (ipCountry) {
    headers['CF-IPCountry'] = ipCountry;
  }
  return new Request('https://vendrome.com/api/waitlist', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

function createDatabase(changes = 1) {
  const capture = {
    query: '',
    values: [],
    runCount: 0,
  };

  const statement = {
    bind(...values) {
      capture.values = values;
      return statement;
    },
    async run() {
      capture.runCount += 1;
      return { success: true, meta: { changes } };
    },
  };

  return {
    capture,
    database: {
      prepare(query) {
        capture.query = query;
        return statement;
      },
    },
  };
}

async function readJson(response) {
  return response.json();
}

test('Vendrome waitlist Pages Function', async (t) => {
  const originalFetch = globalThis.fetch;

  try {
    await t.test('stores a validated, normalized submission', async () => {
      const { database, capture } = createDatabase(1);
      let verificationCalls = 0;
      globalThis.fetch = async () => {
        verificationCalls += 1;
        return Response.json({ success: true, action: 'waitlist' });
      };

      const response = await onRequestPost({
        request: createRequest(),
        env: { WAITLIST_DB: database, TURNSTILE_SECRET_KEY: 'test-secret' },
      });
      const body = await readJson(response);

      assert.equal(response.status, 201);
      assert.equal(body.duplicate, false);
      assert.match(body.message, /on the list/i);
      assert.equal(verificationCalls, 1);
      assert.equal(capture.runCount, 1);
      assert.match(capture.query, /ON CONFLICT\(email\) DO NOTHING/);
      assert.equal(capture.values[1], 'ada@example.com');
      assert.equal(capture.values[2], 'Ada Founder');
      assert.equal(capture.values[3], 'entrepreneur');
      assert.equal(capture.values[5], 'South Africa');
      assert.equal(capture.values[6], 'United Kingdom');
    });

    await t.test('records the IP country even when no country is selected', async () => {
      const { database, capture } = createDatabase(1);
      globalThis.fetch = async () => Response.json({ success: true, action: 'waitlist' });

      const response = await onRequestPost({
        request: createRequest({ ...validSubmission, country: '' }, 'https://vendrome.com', 'ZA'),
        env: { WAITLIST_DB: database, TURNSTILE_SECRET_KEY: 'test-secret' },
      });

      assert.equal(response.status, 201);
      assert.equal(capture.values[5], null);
      assert.equal(capture.values[6], 'South Africa');
    });

    await t.test('leaves ip_country null for unknown or Tor origins', async () => {
      const { database, capture } = createDatabase(1);
      globalThis.fetch = async () => Response.json({ success: true, action: 'waitlist' });

      const response = await onRequestPost({
        request: createRequest({ ...validSubmission, country: '' }, 'https://vendrome.com', 'T1'),
        env: { WAITLIST_DB: database, TURNSTILE_SECRET_KEY: 'test-secret' },
      });

      assert.equal(response.status, 201);
      assert.equal(capture.values[5], null);
      assert.equal(capture.values[6], null);
    });

    await t.test('treats a duplicate email as a safe success', async () => {
      const { database, capture } = createDatabase(0);
      globalThis.fetch = async () => Response.json({ success: true, action: 'waitlist' });

      const response = await onRequestPost({
        request: createRequest(),
        env: { WAITLIST_DB: database, TURNSTILE_SECRET_KEY: 'test-secret' },
      });
      const body = await readJson(response);

      assert.equal(response.status, 200);
      assert.equal(body.duplicate, true);
      assert.match(body.message, /already on the list/i);
      assert.equal(capture.runCount, 1);
    });

    await t.test('rejects invalid allow-listed fields before verification', async () => {
      const { database, capture } = createDatabase();
      let verificationCalls = 0;
      globalThis.fetch = async () => {
        verificationCalls += 1;
        return Response.json({ success: true });
      };

      const response = await onRequestPost({
        request: createRequest({ ...validSubmission, role: 'administrator' }),
        env: { WAITLIST_DB: database, TURNSTILE_SECRET_KEY: 'test-secret' },
      });
      const body = await readJson(response);

      assert.equal(response.status, 400);
      assert.match(body.error, /select the role/i);
      assert.equal(verificationCalls, 0);
      assert.equal(capture.runCount, 0);
    });

    await t.test('absorbs honeypot submissions without verification or storage', async () => {
      const { database, capture } = createDatabase();
      let verificationCalls = 0;
      globalThis.fetch = async () => {
        verificationCalls += 1;
        return Response.json({ success: true });
      };

      const response = await onRequestPost({
        request: createRequest({ ...validSubmission, company: 'bot-filled.example' }),
        env: { WAITLIST_DB: database, TURNSTILE_SECRET_KEY: 'test-secret' },
      });

      assert.equal(response.status, 200);
      assert.equal(verificationCalls, 0);
      assert.equal(capture.runCount, 0);
    });

    await t.test('fails closed when Turnstile rejects a token', async () => {
      const { database, capture } = createDatabase();
      globalThis.fetch = async () =>
        Response.json({ success: false, 'error-codes': ['invalid-input-response'] });

      const response = await onRequestPost({
        request: createRequest(),
        env: { WAITLIST_DB: database, TURNSTILE_SECRET_KEY: 'test-secret' },
      });
      const body = await readJson(response);

      assert.equal(response.status, 400);
      assert.match(body.error, /security check/i);
      assert.equal(capture.runCount, 0);
    });

    await t.test('rejects cross-site submissions', async () => {
      const { database, capture } = createDatabase();
      const response = await onRequestPost({
        request: createRequest(validSubmission, 'https://attacker.example'),
        env: { WAITLIST_DB: database, TURNSTILE_SECRET_KEY: 'test-secret' },
      });

      assert.equal(response.status, 403);
      assert.equal(capture.runCount, 0);
    });

    await t.test('reports unavailable production bindings without leaking details', async () => {
      const response = await onRequestPost({
        request: createRequest(),
        env: {},
      });
      const body = await readJson(response);

      assert.equal(response.status, 503);
      assert.match(body.error, /being prepared/i);
    });

    await t.test('returns method not allowed for reads', async () => {
      const response = await onRequestGet();
      assert.equal(response.status, 405);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
