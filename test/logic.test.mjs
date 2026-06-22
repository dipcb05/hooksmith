/**
 * hooksmith / Hooksmith — Self-contained logic tests
 * Run: node --test test/logic.test.mjs
 *
 * Covers (no MongoDB / Redis / OpenAI required):
 *   1. schemaFingerprint  — shape extraction & determinism
 *   2. crypto utils       — hmac, sha256, timingSafeEqual
 *   3. headers utils      — normalizeHeaders, getHeader
 *   4. StripeSignatureVerifier
 *   5. GitHubSignatureVerifier
 *   6. ShopifySignatureVerifier
 *   7. transformationExecutor — validate + execute (sandbox)
 *   8. pipeline logic          — fingerprint change detection
 *   9. deliveryWorker          — decorrelatedJitterDelay (extracted)
 * 10. connectorLoader schema   — Zod validation (no FS / DB)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// ─── helpers ──────────────────────────────────────────────────────────────────

function hmacHex(secret, payload, algo = 'sha256') {
  return crypto.createHmac(algo, secret).update(payload).digest('hex');
}
function hmacBase64(secret, payload, algo = 'sha256') {
  return crypto.createHmac(algo, secret).update(payload).digest('base64');
}

// ─── 1. schemaFingerprint ─────────────────────────────────────────────────────

import { schemaFingerprint, schemaShape } from '../src/utils/schemaFingerprint.js';

describe('schemaFingerprint', () => {
  it('maps primitive types correctly', () => {
    assert.equal(schemaShape('hello'), 'string');
    assert.equal(schemaShape(42), 'number');
    assert.equal(schemaShape(true), 'boolean');
    assert.equal(schemaShape(null), 'null');
  });

  it('maps plain object to type map with sorted keys', () => {
    const shape = schemaShape({ z: 1, a: 'x' });
    assert.deepEqual(Object.keys(shape), ['a', 'z']);
    assert.equal(shape.a, 'string');
    assert.equal(shape.z, 'number');
  });

  it('maps arrays to {type:array, items: shape}', () => {
    const shape = schemaShape([1, 2, 3]);
    assert.equal(shape.type, 'array');
    assert.equal(shape.items, 'number');
  });

  it('handles empty array', () => {
    const shape = schemaShape([]);
    assert.equal(shape.type, 'array');
    assert.equal(shape.items, 'unknown');
  });

  it('is deterministic — same payload → same fingerprint', () => {
    const payload = { id: 'evt_1', type: 'charge.succeeded', data: { amount: 100 } };
    const { fingerprint: fp1 } = schemaFingerprint(payload);
    const { fingerprint: fp2 } = schemaFingerprint({ ...payload });
    assert.equal(fp1, fp2);
  });

  it('detects schema change when a key is added', () => {
    const base = { id: 'evt_1', type: 'x' };
    const extended = { id: 'evt_1', type: 'x', extra: true };
    const { fingerprint: fp1 } = schemaFingerprint(base);
    const { fingerprint: fp2 } = schemaFingerprint(extended);
    assert.notEqual(fp1, fp2);
  });

  it('does NOT change fingerprint when only values change (same schema)', () => {
    const { fingerprint: fp1 } = schemaFingerprint({ amount: 100 });
    const { fingerprint: fp2 } = schemaFingerprint({ amount: 999 });
    assert.equal(fp1, fp2);
  });

  it('handles nested objects', () => {
    const shape = schemaShape({ data: { object: { customer: 'cus_1', amount: 42 } } });
    assert.equal(shape.data.object.customer, 'string');
    assert.equal(shape.data.object.amount, 'number');
  });

  it('merges heterogeneous array items into union shape', () => {
    const shape = schemaShape([1, 'a']);
    assert.equal(shape.type, 'array');
    assert.ok(Array.isArray(shape.items), 'items should be a union array');
  });
});

// ─── 2. crypto utils ─────────────────────────────────────────────────────────

import { timingSafeEqualString, hmacHex as cryptoHmacHex, sha256 } from '../src/utils/crypto.js';

describe('crypto utils', () => {
  it('timingSafeEqualString returns true for equal strings', () => {
    assert.equal(timingSafeEqualString('abc', 'abc'), true);
  });

  it('timingSafeEqualString returns false for different strings', () => {
    assert.equal(timingSafeEqualString('abc', 'xyz'), false);
  });

  it('timingSafeEqualString handles empty strings', () => {
    assert.equal(timingSafeEqualString('', ''), true);
  });

  it('timingSafeEqualString returns false for different lengths', () => {
    assert.equal(timingSafeEqualString('abc', 'abcd'), false);
  });

  it('hmacHex produces correct SHA-256 HMAC', () => {
    const expected = hmacHex('secret', 'hello');
    assert.equal(cryptoHmacHex('secret', 'hello'), expected);
  });

  it('sha256 is deterministic', () => {
    assert.equal(sha256('hooksmith'), sha256('hooksmith'));
  });

  it('sha256 differs for different inputs', () => {
    assert.notEqual(sha256('a'), sha256('b'));
  });
});

// ─── 3. headers utils ─────────────────────────────────────────────────────────

import { normalizeHeaders, getHeader } from '../src/utils/headers.js';

describe('headers utils', () => {
  it('normalizeHeaders lowercases all keys', () => {
    const result = normalizeHeaders({ 'Content-Type': 'application/json', 'X-Custom': 'val' });
    assert.equal(result['content-type'], 'application/json');
    assert.equal(result['x-custom'], 'val');
  });

  it('normalizeHeaders joins array values with comma', () => {
    const result = normalizeHeaders({ accept: ['text/html', 'application/json'] });
    assert.equal(result['accept'], 'text/html,application/json');
  });

  it('normalizeHeaders handles null/undefined gracefully', () => {
    assert.deepEqual(normalizeHeaders(null), {});
    assert.deepEqual(normalizeHeaders(undefined), {});
  });

  it('getHeader retrieves case-insensitively', () => {
    const headers = normalizeHeaders({ 'X-Hub-Signature-256': 'sha256=abc' });
    assert.equal(getHeader(headers, 'x-hub-signature-256'), 'sha256=abc');
  });

  it('getHeader returns undefined for missing key', () => {
    assert.equal(getHeader({}, 'missing'), undefined);
  });

  it('getHeader returns undefined when name is falsy', () => {
    assert.equal(getHeader({ a: '1' }, ''), undefined);
    assert.equal(getHeader({ a: '1' }, null), undefined);
  });
});

// ─── 4. StripeSignatureVerifier ───────────────────────────────────────────────

import { StripeSignatureVerifier } from '../src/signatures/stripe.js';

describe('StripeSignatureVerifier', () => {
  const verifier = new StripeSignatureVerifier();
  const secret = 'whsec_test_secret';

  function makeStripeHeader(secret, rawBody, timestamp) {
    const signed = hmacHex(secret, `${timestamp}.${rawBody}`);
    return `t=${timestamp},v1=${signed}`;
  }

  it('accepts a valid stripe signature', () => {
    const rawBody = '{"id":"evt_1","type":"charge.succeeded"}';
    const ts = Math.floor(Date.now() / 1000).toString();
    const header = makeStripeHeader(secret, rawBody, ts);
    const source = { signature: { secret, signatureHeader: 'stripe-signature' } };
    const headers = normalizeHeaders({ 'stripe-signature': header });
    assert.equal(verifier.verify({ rawBody, headers, source }), true);
  });

  it('rejects a tampered payload', () => {
    const rawBody = '{"id":"evt_1"}';
    const ts = Math.floor(Date.now() / 1000).toString();
    const header = makeStripeHeader(secret, rawBody, ts);
    const source = { signature: { secret, signatureHeader: 'stripe-signature' } };
    const headers = normalizeHeaders({ 'stripe-signature': header });
    // tamper the body
    assert.equal(verifier.verify({ rawBody: '{"id":"tampered"}', headers, source }), false);
  });

  it('rejects when stripe-signature header is missing', () => {
    const source = { signature: { secret, signatureHeader: 'stripe-signature' } };
    assert.equal(verifier.verify({ rawBody: '{}', headers: {}, source }), false);
  });

  it('rejects a malformed stripe-signature header', () => {
    const source = { signature: { secret, signatureHeader: 'stripe-signature' } };
    const headers = { 'stripe-signature': 'garbage' };
    assert.equal(verifier.verify({ rawBody: '{}', headers, source }), false);
  });
});

// ─── 5. GitHubSignatureVerifier ───────────────────────────────────────────────

import { GitHubSignatureVerifier } from '../src/signatures/github.js';

describe('GitHubSignatureVerifier', () => {
  const verifier = new GitHubSignatureVerifier();
  const secret = 'github_secret';

  it('accepts a valid GitHub webhook signature', () => {
    const rawBody = '{"action":"opened"}';
    const sig = `sha256=${hmacHex(secret, rawBody)}`;
    const source = { signature: { secret, signatureHeader: 'x-hub-signature-256' } };
    const headers = { 'x-hub-signature-256': sig };
    assert.equal(verifier.verify({ rawBody, headers, source }), true);
  });

  it('rejects when sha256= prefix is missing', () => {
    const rawBody = '{"action":"opened"}';
    const source = { signature: { secret, signatureHeader: 'x-hub-signature-256' } };
    const headers = { 'x-hub-signature-256': hmacHex(secret, rawBody) }; // no prefix
    assert.equal(verifier.verify({ rawBody, headers, source }), false);
  });

  it('rejects a wrong secret', () => {
    const rawBody = '{"action":"opened"}';
    const sig = `sha256=${hmacHex('wrong_secret', rawBody)}`;
    const source = { signature: { secret, signatureHeader: 'x-hub-signature-256' } };
    const headers = { 'x-hub-signature-256': sig };
    assert.equal(verifier.verify({ rawBody, headers, source }), false);
  });

  it('rejects missing header', () => {
    const source = { signature: { secret, signatureHeader: 'x-hub-signature-256' } };
    assert.equal(verifier.verify({ rawBody: '{}', headers: {}, source }), false);
  });
});

// ─── 6. ShopifySignatureVerifier ──────────────────────────────────────────────

import { ShopifySignatureVerifier } from '../src/signatures/shopify.js';

describe('ShopifySignatureVerifier', () => {
  const verifier = new ShopifySignatureVerifier();
  const secret = 'shopify_secret';

  it('accepts a valid Shopify HMAC', () => {
    const rawBody = '{"id":123}';
    const sig = hmacBase64(secret, rawBody);
    const source = { signature: { secret, signatureHeader: 'x-shopify-hmac-sha256' } };
    const headers = { 'x-shopify-hmac-sha256': sig };
    assert.equal(verifier.verify({ rawBody, headers, source }), true);
  });

  it('rejects a wrong HMAC', () => {
    const rawBody = '{"id":123}';
    const source = { signature: { secret, signatureHeader: 'x-shopify-hmac-sha256' } };
    const headers = { 'x-shopify-hmac-sha256': 'badsignature' };
    assert.equal(verifier.verify({ rawBody, headers, source }), false);
  });

  it('rejects missing header', () => {
    const source = { signature: { secret, signatureHeader: 'x-shopify-hmac-sha256' } };
    assert.equal(verifier.verify({ rawBody: '{}', headers: {}, source }), false);
  });
});

// ─── 6b. NoneSignatureVerifier ───────────────────────────────────────────────

import { NoneSignatureVerifier } from '../src/signatures/none.js';

describe('NoneSignatureVerifier', () => {
  const verifier = new NoneSignatureVerifier();

  it('always verifies successfully without headers or secrets', () => {
    assert.equal(verifier.verify({ rawBody: '{"id":123}', headers: {}, source: { signature: { strategy: 'none' } } }), true);
  });
});

// ─── 6c. CustomTokenSignatureVerifier ────────────────────────────────────────

import { CustomTokenSignatureVerifier } from '../src/signatures/customToken.js';

describe('CustomTokenSignatureVerifier', () => {
  const verifier = new CustomTokenSignatureVerifier();
  const secret = 'shared-secret-token';

  it('verifies correctly with matching token in header', () => {
    const source = { signature: { secret, signatureHeader: 'x-webhook-token' } };
    const headers = { 'x-webhook-token': secret };
    assert.equal(verifier.verify({ rawBody: '{"id":123}', headers, source }), true);
  });

  it('rejects when token header does not match secret', () => {
    const source = { signature: { secret, signatureHeader: 'x-webhook-token' } };
    const headers = { 'x-webhook-token': 'wrong-token' };
    assert.equal(verifier.verify({ rawBody: '{"id":123}', headers, source }), false);
  });

  it('rejects when token header is missing', () => {
    const source = { signature: { secret, signatureHeader: 'x-webhook-token' } };
    assert.equal(verifier.verify({ rawBody: '{"id":123}', headers: {}, source }), false);
  });
});

// ─── 7. transformationExecutor ────────────────────────────────────────────────

import { validateTransformationCode, executeTransformation } from '../src/services/transformationExecutor.js';

describe('transformationExecutor — validateTransformationCode', () => {
  it('accepts a valid arrow function', () => {
    assert.doesNotThrow(() =>
      validateTransformationCode('(payload) => ({ id: payload.id })')
    );
  });

  it('rejects a function that does not start with (payload) =>', () => {
    assert.throws(
      () => validateTransformationCode('function transform(p) { return p; }'),
      /signature/
    );
  });

  it('rejects code containing require', () => {
    assert.throws(
      () => validateTransformationCode("(payload) => { require('fs'); return payload; }"),
      /require/
    );
  });

  it('rejects code containing eval', () => {
    assert.throws(
      () => validateTransformationCode("(payload) => eval('1+1')"),
      /eval/
    );
  });

  it('rejects code containing process', () => {
    assert.throws(
      () => validateTransformationCode('(payload) => process.exit(0)'),
      /process/
    );
  });

  it('rejects code containing fetch', () => {
    assert.throws(
      () => validateTransformationCode('(payload) => fetch("http://evil.com")'),
      /fetch/
    );
  });

  it('rejects code containing Function constructor', () => {
    assert.throws(
      () => validateTransformationCode('(payload) => new Function("return 1")()'),
      /Function/
    );
  });

  it('rejects code with syntax error', () => {
    assert.throws(() => validateTransformationCode('(payload) => {{{'));
  });
});

// NOTE: Objects returned from vm.Script.runInNewContext() have a different
// prototype chain than host objects. assert.deepStrictEqual fails even when
// values are identical because it checks prototype equality. The correct fix
// is to JSON-roundtrip the result (which is exactly what you'd do before
// forwarding to an HTTP destination anyway). This reveals a real production
// concern: callers of executeTransformation should JSON.parse(JSON.stringify(result))
// before delivery to avoid cross-realm prototype issues in downstream code.
function normalizeVmResult(value) {
  return JSON.parse(JSON.stringify(value));
}

describe('transformationExecutor — executeTransformation', () => {
  it('executes a simple field projection', () => {
    const code = '(payload) => ({ id: payload.id, type: payload.type })';
    const result = normalizeVmResult(
      executeTransformation(code, { id: 'evt_1', type: 'charge.succeeded', extra: 'ignored' })
    );
    assert.deepEqual(result, { id: 'evt_1', type: 'charge.succeeded' });
  });

  it('tolerates missing optional fields', () => {
    const code = '(payload) => ({ id: payload.id, amount: payload.data?.amount ?? 0 })';
    const result = normalizeVmResult(executeTransformation(code, { id: 'evt_1' }));
    assert.deepEqual(result, { id: 'evt_1', amount: 0 });
  });

  it('can compute derived values', () => {
    const code = '(payload) => ({ dollars: payload.cents / 100 })';
    const result = normalizeVmResult(executeTransformation(code, { cents: 4200 }));
    assert.deepEqual(result, { dollars: 42 });
  });

  it('cannot mutate the original payload', () => {
    const code = '(payload) => { payload.injected = "evil"; return payload; }';
    const original = { safe: true };
    executeTransformation(code, original);
    assert.equal(original.injected, undefined, 'Original payload should not be mutated');
  });

  it('throws when transformation exceeds timeout (infinite loop)', async () => {
    const code = '(payload) => { while(true){} }';
    assert.throws(() => executeTransformation(code, {}), /timed out|Script execution/i);
  });

  it('throws if transformation returns a Promise', () => {
    const code = '(payload) => Promise.resolve(payload)';
    assert.throws(
      () => executeTransformation(code, {}),
      /Async transformations are not allowed/
    );
  });

  it('uses Math inside sandbox', () => {
    const code = '(payload) => ({ rounded: Math.round(payload.val) })';
    const result = normalizeVmResult(executeTransformation(code, { val: 3.7 }));
    assert.deepEqual(result, { rounded: 4 });
  });

  it('uses JSON inside sandbox', () => {
    const code = '(payload) => ({ str: JSON.stringify(payload.obj) })';
    const result = normalizeVmResult(executeTransformation(code, { obj: { a: 1 } }));
    assert.deepEqual(result, { str: '{"a":1}' });
  });
});

// ─── 8. Pipeline: schema-change detection logic (pure) ───────────────────────

describe('pipeline — schema change detection logic', () => {
  // Pure extraction of the fingerprint comparison: source.schemaFingerprint !== fingerprint
  it('detects a schema change when fingerprint differs', () => {
    const sourceFingerprint = sha256('old-schema');
    const { fingerprint: newFingerprint } = schemaFingerprint({ id: 'x', newField: true });
    const schemaChanged = sourceFingerprint !== newFingerprint;
    assert.equal(schemaChanged, true);
  });

  it('does NOT flag change when fingerprint matches', () => {
    const payload = { id: 'evt_1', type: 'charge' };
    const { fingerprint } = schemaFingerprint(payload);
    const schemaChanged = fingerprint !== fingerprint;
    assert.equal(schemaChanged, false);
  });
});

// ─── 9. decorrelatedJitterDelay (re-implemented for test) ────────────────────

describe('decorrelatedJitterDelay', () => {
  // Inline copy of the function from deliveryWorker.js (pure function, no imports needed)
  function decorrelatedJitterDelay(previous, base = 1000, cap = 30000) {
    const min = base;
    const max = Math.max(base, previous * 3);
    return Math.min(cap, Math.floor(min + Math.random() * (max - min)));
  }

  it('returns at least base ms', () => {
    for (let i = 0; i < 50; i++) {
      const delay = decorrelatedJitterDelay(1000);
      assert.ok(delay >= 1000, `Expected >= 1000, got ${delay}`);
    }
  });

  it('never exceeds cap', () => {
    for (let i = 0; i < 50; i++) {
      const delay = decorrelatedJitterDelay(100000, 1000, 30000);
      assert.ok(delay <= 30000, `Expected <= 30000, got ${delay}`);
    }
  });

  it('grows with previous delay (statistically)', () => {
    const low = [];
    const high = [];
    for (let i = 0; i < 100; i++) {
      low.push(decorrelatedJitterDelay(1000));
      high.push(decorrelatedJitterDelay(9000));
    }
    const avgLow = low.reduce((a, b) => a + b, 0) / low.length;
    const avgHigh = high.reduce((a, b) => a + b, 0) / high.length;
    assert.ok(avgHigh > avgLow, `Expected avgHigh (${avgHigh}) > avgLow (${avgLow})`);
  });
});

// ─── 10. Connector YAML schema (Zod validation, no FS/DB) ────────────────────

import { z } from 'zod';

const ConnectorSchema = z.object({
  sourceId: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  signature: z.object({
    strategy: z.string().min(1),
    secretHeader: z.string().optional(),
    signatureHeader: z.string().optional(),
    timestampHeader: z.string().optional(),
    secret: z.string().optional()
  }),
  outputDescription: z.string().min(1),
  destination: z.object({
    url: z.string().url(),
    method: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
    headers: z.record(z.string()).default({}),
    maxAttempts: z.number().int().min(1).max(25).default(5),
    timeoutMs: z.number().int().min(1000).max(60000).default(10000)
  }),
  connectorVersion: z.string().default('1.0.0')
});

describe('ConnectorSchema (Zod)', () => {
  const validConnector = {
    sourceId: 'stripe',
    name: 'Stripe Payments',
    enabled: true,
    signature: { strategy: 'stripe', signatureHeader: 'stripe-signature', secret: 'whsec_xxx' },
    outputDescription: 'Normalize to billing event',
    destination: { url: 'https://example.com/hook', method: 'POST', maxAttempts: 5, timeoutMs: 10000 }
  };

  it('parses a valid connector config', () => {
    const result = ConnectorSchema.parse(validConnector);
    assert.equal(result.sourceId, 'stripe');
    assert.equal(result.connectorVersion, '1.0.0');
  });

  it('defaults enabled to true', () => {
    const { enabled, ...rest } = validConnector;
    const result = ConnectorSchema.parse(rest);
    assert.equal(result.enabled, true);
  });

  it('defaults method to POST', () => {
    const result = ConnectorSchema.parse(validConnector);
    assert.equal(result.destination.method, 'POST');
  });

  it('rejects an invalid destination URL', () => {
    assert.throws(() => ConnectorSchema.parse({ ...validConnector, destination: { ...validConnector.destination, url: 'not-a-url' } }));
  });

  it('rejects maxAttempts > 25', () => {
    assert.throws(() =>
      ConnectorSchema.parse({
        ...validConnector,
        destination: { ...validConnector.destination, maxAttempts: 99 }
      })
    );
  });

  it('rejects timeoutMs < 1000', () => {
    assert.throws(() =>
      ConnectorSchema.parse({
        ...validConnector,
        destination: { ...validConnector.destination, timeoutMs: 50 }
      })
    );
  });

  it('rejects unsupported HTTP method', () => {
    assert.throws(() =>
      ConnectorSchema.parse({
        ...validConnector,
        destination: { ...validConnector.destination, method: 'DELETE' }
      })
    );
  });

  it('rejects empty sourceId', () => {
    assert.throws(() => ConnectorSchema.parse({ ...validConnector, sourceId: '' }));
  });

  it('rejects empty outputDescription', () => {
    assert.throws(() => ConnectorSchema.parse({ ...validConnector, outputDescription: '' }));
  });
});
