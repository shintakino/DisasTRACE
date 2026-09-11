import assert from 'node:assert/strict';
import { createDeepSeekRequestBody, runDeepSeekGateway } from '../lib/chatbot/deepseek-gateway';

const input = { message: 'What is DisasTRACE?', candidates: [{ id: 'about-disastrace', keywords: ['DisasTRACE'] }] };

async function check(name: string, assertion: () => Promise<void>) {
  try {
    await assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function main() {
await check('uses the requested model, JSON mode, disabled thinking, and stable candidate prefix', async () => {
  const body = createDeepSeekRequestBody(input);
  assert.equal(body.model, 'deepseek-v4-flash');
  assert.deepEqual(body.response_format, { type: 'json_object' });
  assert.deepEqual(body.thinking, { type: 'disabled' });
  assert.match(body.messages[1].content, /about-disastrace/);
  assert.equal(body.messages[2].content, input.message);
});

await check('stays disabled without a server key', async () => {
  let calls = 0;
  const result = await runDeepSeekGateway(input, { fetchImpl: async () => { calls += 1; return jsonResponse(200, {}); } });
  assert.equal(result.outcome, 'disabled');
  assert.equal(calls, 0);
});

await check('accepts only a strict structured result and records usage', async () => {
  const result = await runDeepSeekGateway(input, {
    apiKey: 'test-only',
    fetchImpl: async () => jsonResponse(200, {
      choices: [{ message: { content: JSON.stringify({ action: 'ANSWER_CONTEXT', knowledgeId: 'about-disastrace', incidentType: null, nature: null, languageStyle: 'en', confidence: 0.95 }) } }],
      usage: { prompt_tokens: 10, prompt_cache_hit_tokens: 8, prompt_cache_miss_tokens: 2, completion_tokens: 4 },
    }),
  });
  assert.equal(result.outcome, 'matched');
  assert.equal(result.suggestion?.knowledgeId, 'about-disastrace');
  assert.deepEqual(result.usage, { promptTokens: 10, cacheHitTokens: 8, cacheMissTokens: 2, outputTokens: 4 });
});

await check('accepts only a complete approved report classification', async () => {
  const result = await runDeepSeekGateway(input, {
    apiKey: 'test-only',
    fetchImpl: async () => jsonResponse(200, {
      choices: [{ message: { content: JSON.stringify({ action: 'CLASSIFY_REPORT', knowledgeId: null, incidentType: 'Medical Emergency', nature: 'EMERGENCY', languageStyle: 'taglish', confidence: 0.9 }) } }],
    }),
  });
  assert.equal(result.outcome, 'matched');
  assert.equal(result.suggestion?.incidentType, 'Medical Emergency');
});

await check('rejects a malformed report classification', async () => {
  const result = await runDeepSeekGateway(input, {
    apiKey: 'test-only',
    fetchImpl: async () => jsonResponse(200, {
      choices: [{ message: { content: JSON.stringify({ action: 'CLASSIFY_REPORT', knowledgeId: null, incidentType: 'Medical Emergency', nature: null, languageStyle: 'en', confidence: 0.9 }) } }],
    }),
  });
  assert.equal(result.outcome, 'malformed');
  assert.equal(result.suggestion, null);
});

for (const scenario of [
  { name: 'empty result', status: 200, body: {}, outcome: 'malformed' },
  { name: 'malformed JSON', status: 200, body: { choices: [{ message: { content: '{not-json' } }] }, outcome: 'malformed' },
  { name: '429 throttle', status: 429, body: {}, outcome: 'throttled' },
  { name: '500 failure', status: 500, body: {}, outcome: 'provider_error' },
  { name: '503 failure', status: 503, body: {}, outcome: 'provider_error' },
] as const) {
  await check(`retries and safely degrades for ${scenario.name}`, async () => {
    let calls = 0;
    const result = await runDeepSeekGateway(input, {
      apiKey: 'test-only',
      fetchImpl: async () => { calls += 1; return jsonResponse(scenario.status, scenario.body); },
    });
    assert.equal(calls, 2);
    assert.equal(result.outcome, scenario.outcome);
    assert.equal(result.suggestion, null);
  });
}

await check('does not retry a provider configuration error', async () => {
  let calls = 0;
  const result = await runDeepSeekGateway(input, {
    apiKey: 'test-only',
    fetchImpl: async () => { calls += 1; return jsonResponse(401, {}); },
  });
  assert.equal(calls, 1);
  assert.equal(result.outcome, 'provider_error');
});

await check('times out twice and returns a controlled timeout result', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async (_url, init) => {
    calls += 1;
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
  };
  const result = await runDeepSeekGateway(input, { apiKey: 'test-only', fetchImpl, timeoutMs: 5 });
  assert.equal(calls, 2);
  assert.equal(result.outcome, 'timeout');
});

console.log('All DeepSeek gateway checks passed.');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
