import { z } from 'zod';

export const ProviderSuggestionSchema = z.object({
  action: z.enum(['ANSWER_CONTEXT', 'FALLBACK']),
  knowledgeId: z.string().max(80).nullable(),
  languageStyle: z.enum(['en', 'fil', 'taglish']),
  confidence: z.number().min(0).max(1),
}).strict();

export interface DeepSeekUsage {
  promptTokens: number;
  cacheHitTokens: number;
  cacheMissTokens: number;
  outputTokens: number;
}

export interface DeepSeekResult {
  suggestion: z.infer<typeof ProviderSuggestionSchema> | null;
  outcome: 'matched' | 'disabled' | 'timeout' | 'malformed' | 'throttled' | 'provider_error';
  latencyMs: number;
  usage: DeepSeekUsage;
}

interface DeepSeekBody {
  choices?: { message?: { content?: string } }[];
  usage?: {
    prompt_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
    completion_tokens?: number;
  };
}

const SYSTEM_PROMPT = `Return JSON only with this exact schema:
{"action":"ANSWER_CONTEXT"|"FALLBACK","knowledgeId":string|null,"languageStyle":"en"|"fil"|"taglish","confidence":number}
Select only one supplied candidate ID. Use FALLBACK with a null ID if none fits. Do not answer the question, infer report fields, include personal data, or invent an ID.`;

const EMPTY_USAGE: DeepSeekUsage = { promptTokens: 0, cacheHitTokens: 0, cacheMissTokens: 0, outputTokens: 0 };

function readUsage(body: DeepSeekBody): DeepSeekUsage {
  return {
    promptTokens: body.usage?.prompt_tokens ?? 0,
    cacheHitTokens: body.usage?.prompt_cache_hit_tokens ?? 0,
    cacheMissTokens: body.usage?.prompt_cache_miss_tokens ?? 0,
    outputTokens: body.usage?.completion_tokens ?? 0,
  };
}

export function createDeepSeekRequestBody(input: {
  message: string;
  candidates: { id: string; keywords: string[] }[];
}) {
  return {
    model: 'deepseek-v4-flash',
    temperature: 0,
    max_tokens: 120,
    response_format: { type: 'json_object' },
    thinking: { type: 'disabled' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `Approved candidates: ${JSON.stringify(input.candidates)}` },
      { role: 'user', content: input.message },
    ],
  };
}

/**
 * Key-free gateway core. The server-only wrapper injects the environment key;
 * tests inject a fake fetch implementation without loading server secrets.
 */
export async function runDeepSeekGateway(
  input: { message: string; candidates: { id: string; keywords: string[] }[] },
  options: { apiKey?: string; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<DeepSeekResult> {
  const startedAt = Date.now();
  if (!options.apiKey) return { suggestion: null, outcome: 'disabled', latencyMs: 0, usage: EMPTY_USAGE };

  const fetchImpl = options.fetchImpl ?? fetch;
  let lastOutcome: DeepSeekResult['outcome'] = 'provider_error';
  let usage = EMPTY_USAGE;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5_000);
    try {
      const response = await fetchImpl('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(createDeepSeekRequestBody(input)),
      });
      if (response.status === 429) {
        lastOutcome = 'throttled';
        continue;
      }
      if (response.status >= 500) {
        lastOutcome = 'provider_error';
        continue;
      }
      if (!response.ok) return { suggestion: null, outcome: 'provider_error', latencyMs: Date.now() - startedAt, usage };

      let body: DeepSeekBody;
      try {
        body = await response.json() as DeepSeekBody;
      } catch {
        lastOutcome = 'malformed';
        continue;
      }
      usage = readUsage(body);
      const content = body.choices?.[0]?.message?.content;
      if (!content) {
        lastOutcome = 'malformed';
        continue;
      }
      try {
        const parsed = ProviderSuggestionSchema.safeParse(JSON.parse(content));
        if (parsed.success) return { suggestion: parsed.data, outcome: 'matched', latencyMs: Date.now() - startedAt, usage };
      } catch {
        // Fall through to the controlled malformed retry.
      }
      lastOutcome = 'malformed';
    } catch (error) {
      lastOutcome = error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'provider_error';
    } finally {
      clearTimeout(timeout);
    }
  }
  return { suggestion: null, outcome: lastOutcome, latencyMs: Date.now() - startedAt, usage };
}
