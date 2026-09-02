import { z } from 'zod';
import { supabase } from '../lib/supabase';
import {
  ChatbotResponseSchema,
  ChatbotStatusResponseSchema,
  type ChatbotDraft,
  type ChatbotReporterMode,
  type ChatbotResponse,
  type ChatbotSlot,
  type ChatbotStatus,
} from '../lib/chatbot-contracts';

const API_URL = process.env.EXPO_PUBLIC_MOBILE_API_URL || 'http://192.168.1.8:3000/api';

const ApiEnvelopeSchema = z.object({
  data: ChatbotResponseSchema,
  error: z.null(),
  message: z.string().nullable(),
}).strict();

const IntakeResponseSchema = z.object({
  success: z.literal(true),
  request: z.object({
    id: z.string().uuid(),
    requestId: z.string().min(1),
    status: z.string().min(1),
    triageClassification: z.string().optional(),
  }).passthrough(),
  incident: z.object({ id: z.string() }).passthrough().nullable(),
  guestAccessToken: z.string().length(64).nullable().optional(),
  autoDispatched: z.boolean(),
  replayed: z.boolean(),
}).passthrough();

export type IntakeResult = z.infer<typeof IntakeResponseSchema>;

export class ChatbotApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ChatbotApiError';
  }
}

async function getAuthorizationHeader(reporterMode: ChatbotReporterMode): Promise<Record<string, string>> {
  if (reporterMode === 'guest') return {};
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new ChatbotApiError('Please sign in again to continue.', 401);
  return { Authorization: `Bearer ${session.access_token}` };
}

async function parseResponse(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage = body && typeof body === 'object'
      ? (body as { error?: unknown; message?: unknown }).error ?? (body as { message?: unknown }).message
      : null;
    throw new ChatbotApiError(typeof errorMessage === 'string' ? errorMessage : 'The request could not be completed.', response.status);
  }
  return body;
}

export async function askChatbot(input: {
  message: string;
  reporterMode: ChatbotReporterMode;
  mode: 'IDLE' | 'DRAFT' | 'SUBMITTED_PENDING';
  draft: ChatbotDraft;
  pendingSlot?: ChatbotSlot;
}): Promise<ChatbotResponse> {
  const authorization = await getAuthorizationHeader(input.reporterMode);
  const response = await fetch(`${API_URL}/chatbot/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authorization },
    body: JSON.stringify({
      message: input.message,
      reporterMode: input.reporterMode,
      mode: input.mode,
      draft: {
        pendingSlot: input.pendingSlot,
        incidentType: input.draft.incidentType,
        nature: input.draft.nature,
        peopleInvolved: input.draft.peopleInvolved,
        victimCondition: input.draft.victimCondition,
      },
    }),
  });
  const parsed = ApiEnvelopeSchema.safeParse(await parseResponse(response));
  if (!parsed.success) throw new ChatbotApiError('The chatbot returned an invalid response.', 502);
  return parsed.data.data;
}

export async function submitChatbotReport(input: {
  reporterMode: ChatbotReporterMode;
  submissionId: string;
  draft: Required<Pick<ChatbotDraft, 'imageUrl' | 'incidentType' | 'nature' | 'latitude' | 'longitude' | 'peopleInvolved' | 'victimCondition'>> & ChatbotDraft;
}): Promise<IntakeResult> {
  const authorization = await getAuthorizationHeader(input.reporterMode);
  const response = await fetch(`${API_URL}/emergency-intake/${input.reporterMode === 'guest' ? 'guest' : 'registered'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authorization },
    body: JSON.stringify({
      ...(input.reporterMode === 'guest' ? { contactNumber: input.draft.contactNumber } : {}),
      incidentType: input.draft.incidentType,
      peopleInvolved: input.draft.peopleInvolved,
      victimCondition: input.draft.victimCondition,
      landmarks: input.draft.landmarks?.trim() || undefined,
      latitude: input.draft.latitude,
      longitude: input.draft.longitude,
      nature: input.draft.nature,
      severity: input.draft.victimCondition === 'Unconscious / critical'
        ? 'Critical'
        : input.draft.nature === 'EMERGENCY' ? 'High' : 'Low',
      imageUrl: input.draft.imageUrl,
      chatbotSubmissionId: input.submissionId,
    }),
  });
  const parsed = IntakeResponseSchema.safeParse(await parseResponse(response));
  if (!parsed.success) throw new ChatbotApiError('The report server returned an invalid response.', 502);
  return parsed.data;
}

export async function getChatbotReportStatus(input: {
  reporterMode: ChatbotReporterMode;
  requestId: string;
  guestAccessToken?: string;
}): Promise<ChatbotStatus> {
  const authorization = await getAuthorizationHeader(input.reporterMode);
  const query = new URLSearchParams({ requestId: input.requestId });
  if (input.reporterMode === 'guest' && input.guestAccessToken) query.set('accessToken', input.guestAccessToken);
  const response = await fetch(`${API_URL}/emergency-intake/status?${query.toString()}`, {
    headers: { Accept: 'application/json', ...authorization },
  });
  const parsed = ChatbotStatusResponseSchema.safeParse(await parseResponse(response));
  if (!parsed.success) throw new ChatbotApiError('The report status response was invalid.', 502);
  return parsed.data.data;
}

export async function cancelChatbotReport(input: {
  reporterMode: ChatbotReporterMode;
  requestId: string;
  guestAccessToken?: string;
}): Promise<void> {
  const authorization = await getAuthorizationHeader(input.reporterMode);
  const endpoint = input.reporterMode === 'guest' ? 'emergency-intake/cancel' : 'emergency-intake/cancel/registered';
  const body = input.reporterMode === 'guest'
    ? { requestId: input.requestId, accessToken: input.guestAccessToken }
    : { requestId: input.requestId };
  const response = await fetch(`${API_URL}/${endpoint}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authorization },
    body: JSON.stringify(body),
  });
  await parseResponse(response);
}
