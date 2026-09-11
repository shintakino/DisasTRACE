import { z } from 'zod';
import { CHATBOT_INCIDENT_TYPES } from '@/lib/chatbot/contracts';

export const ProviderSuggestionSchema = z.object({
  action: z.enum(['ANSWER_CONTEXT', 'CLASSIFY_REPORT', 'FALLBACK']),
  knowledgeId: z.string().max(80).nullable(),
  incidentType: z.enum(CHATBOT_INCIDENT_TYPES).nullable(),
  nature: z.enum(['EMERGENCY', 'NON-EMERGENCY']).nullable(),
  languageStyle: z.enum(['en', 'fil', 'taglish']),
  confidence: z.number().min(0).max(1),
}).strict().superRefine((value, context) => {
  if (value.action === 'ANSWER_CONTEXT' && !value.knowledgeId) {
    context.addIssue({ code: 'custom', message: 'ANSWER_CONTEXT requires a knowledge ID.' });
  }
  if (value.action === 'CLASSIFY_REPORT' && (!value.incidentType || !value.nature || value.knowledgeId)) {
    context.addIssue({ code: 'custom', message: 'CLASSIFY_REPORT requires only an incident type and nature.' });
  }
  if (value.action === 'FALLBACK' && (value.knowledgeId || value.incidentType || value.nature)) {
    context.addIssue({ code: 'custom', message: 'FALLBACK cannot include a suggestion.' });
  }
});

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
{"action":"ANSWER_CONTEXT"|"CLASSIFY_REPORT"|"FALLBACK","knowledgeId":string|null,"incidentType":"Medical Emergency"|"Vehicular Collision"|"Fire Emergency"|"Structural Failure"|"Flood/Water"|"Unknown Cause"|"Patient Transport"|"Other / non-emergency request"|null,"nature":"EMERGENCY"|"NON-EMERGENCY"|null,"languageStyle":"en"|"fil"|"taglish","confidence":number}
For an approved knowledge question, select only one supplied candidate ID and use ANSWER_CONTEXT. For a user message that describes an incident or request for help but does not fit a candidate, use CLASSIFY_REPORT only when the meaning is clear and choose only an existing incident type and its matching nature. Use FALLBACK with all nullable fields null if uncertain. Do not answer the question, diagnose, infer people counts or conditions, include personal data, or invent an ID.`;

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
