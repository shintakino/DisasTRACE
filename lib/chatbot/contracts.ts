import { z } from 'zod';

export const CHATBOT_INCIDENT_TYPES = [
  'Medical Emergency',
  'Vehicular Collision',
  'Fire Emergency',
  'Structural Failure',
  'Flood/Water',
  'Unknown Cause',
  'Patient Transport',
  'Other / non-emergency request',
] as const;

export const CHATBOT_CONDITIONS = [
  'Conscious and stable',
  'Conscious and unstable',
  'Unconscious / critical',
  'No injuries reported',
  'Unknown / cannot assess',
] as const;

export const ChatbotModeSchema = z.enum(['IDLE', 'DRAFT', 'SUBMITTED_PENDING']);
export const ChatbotSlotSchema = z.enum(['evidence', 'incidentType', 'contactNumber', 'location', 'peopleInvolved', 'victimCondition', 'review']);
export const ChatbotActionSchema = z.enum(['ANSWER_CONTEXT', 'START_REPORT', 'FILL_SLOTS', 'CONTINUE_REPORT', 'CANCEL_DRAFT', 'CANCEL_SUBMITTED', 'FALLBACK']);
export const ChatbotSubmissionIdSchema = z.string().uuid();

export const ChatbotDraftSummarySchema = z.object({
  incidentType: z.enum(CHATBOT_INCIDENT_TYPES).optional(),
  nature: z.enum(['EMERGENCY', 'NON-EMERGENCY']).optional(),
  peopleInvolved: z.number().int().min(1).max(999).optional(),
  victimCondition: z.enum(CHATBOT_CONDITIONS).optional(),
  pendingSlot: ChatbotSlotSchema.optional(),
}).strict();

export const ChatbotRespondRequestSchema = z.object({
  message: z.string().trim().min(1).max(500),
  reporterMode: z.enum(['guest', 'registered']),
  mode: ChatbotModeSchema,
  draft: ChatbotDraftSummarySchema.default({}),
  languageHint: z.enum(['en', 'fil', 'taglish']).optional(),
  conversationNonce: z.string().trim().min(16).max(128).optional(),
}).strict();

export const ChatbotResponseSchema = z.object({
  reply: z.string().min(1).max(800),
  replyKey: z.string().min(1).max(80),
  action: ChatbotActionSchema,
  languageStyle: z.enum(['en', 'fil', 'taglish']).default('en'),
  slotUpdates: z.object({
    incidentType: z.enum(CHATBOT_INCIDENT_TYPES).optional(),
    nature: z.enum(['EMERGENCY', 'NON-EMERGENCY']).optional(),
    peopleInvolved: z.number().int().min(1).max(999).optional(),
    victimCondition: z.enum(CHATBOT_CONDITIONS).optional(),
  }).default({}),
  nextSlot: ChatbotSlotSchema.optional(),
  shouldStartDraft: z.boolean().default(false),
  resumePending: z.boolean().default(false),
  providerFallback: z.boolean().default(false),
}).strict();

export type ChatbotResponse = z.infer<typeof ChatbotResponseSchema>;
export type ChatbotRespondRequest = z.infer<typeof ChatbotRespondRequestSchema>;

/** Accept only one exact count; ranges such as "2-5" are intentionally rejected. */
export function parseExactPeopleCount(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  const normalized = trimmed
    .replace(/^(?:actually|correction:?|sorry,?|make that)\s+(?:it(?:'s| is)\s+)?/, '')
    .replace(/\s+pala$/, '')
    .trim();
  const numberWords: Record<string, number> = {
    one: 1, isa: 1, dalawa: 2, two: 2, tatlo: 3, three: 3,
    apat: 4, four: 4, lima: 5, five: 5, anim: 6, six: 6,
    pito: 7, seven: 7, walo: 8, eight: 8, siyam: 9, nine: 9,
    sampu: 10, ten: 10,
  };
  if (numberWords[normalized]) return numberWords[normalized];
  if (!/^\d{1,3}$/.test(normalized)) return null;
  const count = Number(normalized);
  return count >= 1 && count <= 999 ? count : null;
}

export interface IntakeProgressState {
  evidence?: boolean;
  incidentType?: typeof CHATBOT_INCIDENT_TYPES[number];
  nature?: 'EMERGENCY' | 'NON-EMERGENCY';
  contactNumber?: boolean;
  location?: boolean;
  peopleInvolved?: number;
  victimCondition?: typeof CHATBOT_CONDITIONS[number];
  submitted?: boolean;
}

export function deriveIntakePhase(state: IntakeProgressState): 1 | 2 | 3 | 4 | 5 {
  if (state.submitted) return 5;
  if (state.peopleInvolved && state.victimCondition) return 4;
  if (state.location && state.contactNumber) return 3;
  if (state.evidence && state.incidentType && state.nature) return 2;
  return 1;
}
