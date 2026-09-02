import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema/users';
import { ChatbotRespondRequestSchema, ChatbotResponseSchema } from '@/lib/chatbot/contracts';
import { getDeepSeekSuggestion } from '@/lib/chatbot/deepseek';
import { getKnowledgeAnswer, KNOWLEDGE_CATALOG } from '@/lib/chatbot/knowledge';
import { deterministicChatbotResponse, chatbotSlotPrompt } from '@/lib/chatbot/policy';
import { prepareProviderMessage } from '@/lib/chatbot/privacy';
import { checkChatbotRateLimit } from '@/lib/chatbot/rate-limit';
import { createClient } from '@/lib/supabase-server';

function errorResponse(error: string, status: number, retryAfterSeconds?: number) {
  return NextResponse.json(
    { data: null, error, message: error },
    { status, ...(retryAfterSeconds ? { headers: { 'Retry-After': String(retryAfterSeconds) } } : {}) },
  );
}

async function authorizeRegisteredCaller() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const resident = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, status: true, verificationStatus: true },
  });
  return resident?.role === 'public_user' && resident.status === 'ACTIVE' && resident.verificationStatus === 'APPROVED';
}

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const parsed = ChatbotRespondRequestSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse('Invalid chatbot message.', 400);
    if (parsed.data.reporterMode === 'registered' && !(await authorizeRegisteredCaller())) return errorResponse('Unauthorized chatbot request.', 401);

    const networkKey = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkChatbotRateLimit({ reporterMode: parsed.data.reporterMode, networkKey, conversationNonce: parsed.data.conversationNonce });
    if (rateLimit.limited) return errorResponse('Please wait before sending another chatbot message.', 429, rateLimit.retryAfterSeconds);

    let response = deterministicChatbotResponse(parsed.data);
    let resultClass = response.replyKey === 'out-of-context' ? 'fallback' : 'deterministic';
    let providerMetadata = { outcome: 'not_called', latencyMs: 0, usage: { promptTokens: 0, cacheHitTokens: 0, cacheMissTokens: 0, outputTokens: 0 } };
    const providerMessage = response.replyKey === 'out-of-context' && /\?|\b(what|how|why|who|ano|paano|bakit|sino)\b/i.test(parsed.data.message)
      ? prepareProviderMessage(parsed.data.message)
      : null;

    if (providerMessage) {
      const providerResult = await getDeepSeekSuggestion({
        message: providerMessage,
        candidates: KNOWLEDGE_CATALOG.map(({ id, keywords }) => ({ id, keywords })),
      });
      providerMetadata = { outcome: providerResult.outcome, latencyMs: providerResult.latencyMs, usage: providerResult.usage };
      const suggestion = providerResult.suggestion;
      const knowledge = suggestion?.knowledgeId && suggestion.confidence >= 0.72
        ? KNOWLEDGE_CATALOG.find((candidate) => candidate.id === suggestion.knowledgeId)
        : undefined;
      if (knowledge) {
        const resume = parsed.data.mode === 'DRAFT' && parsed.data.draft.pendingSlot
          ? ` ${chatbotSlotPrompt(parsed.data.draft.pendingSlot, suggestion?.languageStyle ?? response.languageStyle)}`
          : '';
        response = {
          ...response,
          reply: `${getKnowledgeAnswer(knowledge, suggestion?.languageStyle ?? response.languageStyle)}${resume}`,
          replyKey: knowledge.id,
          action: 'ANSWER_CONTEXT',
          languageStyle: suggestion?.languageStyle ?? response.languageStyle,
          resumePending: Boolean(resume),
        };
        resultClass = 'model_match';
      } else if (providerResult.outcome !== 'matched' && providerResult.outcome !== 'disabled') {
        response = { ...response, providerFallback: true };
        resultClass = providerResult.outcome;
      }
    }

    const validatedResponse = ChatbotResponseSchema.parse(response);
    console.info('[chatbot-response]', {
      traceId,
      reporterMode: parsed.data.reporterMode,
      resultClass,
      totalLatencyMs: Date.now() - startedAt,
      providerLatencyMs: providerMetadata.latencyMs,
      providerOutcome: providerMetadata.outcome,
      ...providerMetadata.usage,
    });
    return NextResponse.json({ data: validatedResponse, error: null, message: null });
  } catch (error) {
    console.error('[chatbot-response-error]', { traceId, errorType: error instanceof Error ? error.name : 'unknown' });
    return errorResponse('Unable to process the chatbot message.', 500);
  }
}
