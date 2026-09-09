import { z } from 'zod';

export const CHATBOT_INCIDENT_TYPES = [
  'Medical Emergency',
  'Vehicular Collision',
  'Fire Emergency',
  'Structural Failure',
  'Flood/Water',
  'Unknown Cause',
] as const;

/**
 * The selector exposes only the existing emergency incident types. Nature is
 * therefore a system classification, not a reporter choice. Free-text intake
 * can still classify a patient-transport request as non-emergency in policy.
 */
export function deriveChatbotNature(incidentType: typeof CHATBOT_INCIDENT_TYPES[number]): 'EMERGENCY' {
  if (!CHATBOT_INCIDENT_TYPES.includes(incidentType)) return 'EMERGENCY';
  return 'EMERGENCY';
}

export const CHATBOT_CONDITIONS = [
  'Conscious and stable',
  'Conscious and unstable',
  'Unconscious / critical',
  'No injuries reported',
  'Unknown / cannot assess',
] as const;

export const CHATBOT_SLOTS = [
  'evidence',
  'incidentType',
  'contactNumber',
  'location',
  'peopleInvolved',
  'victimCondition',
  'review',
] as const;

export const ChatbotLifecycleSchema = z.enum([
  'IDLE',
  'DRAFT',
  'SUBMITTING',
  'SUBMITTED_PENDING',
  'ACTIVE_RESPONSE',
]);
export const ChatbotReporterModeSchema = z.enum(['guest', 'registered']);
export const ChatbotSlotSchema = z.enum(CHATBOT_SLOTS);
export const ChatbotSubmissionIdSchema = z.string().uuid();

export const ChatbotDraftSchema = z.object({
  photoUri: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  incidentType: z.enum(CHATBOT_INCIDENT_TYPES).optional(),
  nature: z.enum(['EMERGENCY', 'NON-EMERGENCY']).optional(),
  contactNumber: z.string().optional(),
  landmarks: z.string().max(600).optional(),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
  photoLatitude: z.number().finite().min(-90).max(90).optional(),
  photoLongitude: z.number().finite().min(-180).max(180).optional(),
  peopleInvolved: z.number().int().min(1).max(999).optional(),
  victimCondition: z.enum(CHATBOT_CONDITIONS).optional(),
}).strict();

export const ChatbotActiveReportSchema = z.object({
  id: z.string().uuid(),
  displayId: z.string().min(1),
  reporterMode: ChatbotReporterModeSchema,
  guestAccessToken: z.string().length(64).optional(),
  incidentId: z.string().optional(),
  trackingRequestId: z.string().optional(),
  status: z.string().min(1),
  responseStatus: z.string().min(1),
  triageClassification: z.string().optional(),
  hasIncident: z.boolean(),
  isMergedDuplicate: z.boolean().optional(),
}).strict();

export const ChatbotResponseSchema = z.object({
  reply: z.string().min(1).max(800),
  replyKey: z.string().min(1).max(80),
  action: z.enum(['ANSWER_CONTEXT', 'START_REPORT', 'FILL_SLOTS', 'CONTINUE_REPORT', 'CANCEL_DRAFT', 'CANCEL_SUBMITTED', 'FALLBACK']),
  languageStyle: z.enum(['en', 'fil', 'taglish']),
  slotUpdates: z.object({
    incidentType: z.enum(CHATBOT_INCIDENT_TYPES).optional(),
    nature: z.enum(['EMERGENCY', 'NON-EMERGENCY']).optional(),
    peopleInvolved: z.number().int().min(1).max(999).optional(),
    victimCondition: z.enum(CHATBOT_CONDITIONS).optional(),
  }).strict(),
  nextSlot: ChatbotSlotSchema.optional(),
  shouldStartDraft: z.boolean(),
  resumePending: z.boolean(),
  providerFallback: z.boolean(),
}).strict();

export const ChatbotStatusResponseSchema = z.object({
  data: z.object({
    status: z.string().min(1),
    triageClassification: z.string().nullable().optional(),
    coordinationAgencies: z.array(z.string()).optional(),
    responseStatus: z.string().min(1),
    incident: z.object({ id: z.string() }).passthrough().nullable(),
    responder: z.object({
      id: z.string(),
      fullName: z.string().nullable().optional(),
      lastLatitude: z.number().nullable().optional(),
      lastLongitude: z.number().nullable().optional(),
    }).passthrough().nullable(),
    trackingRequestId: z.string(),
    isMergedDuplicate: z.boolean(),
  }),
  error: z.null(),
  message: z.string().nullable(),
}).strict();

export type ChatbotLifecycle = z.infer<typeof ChatbotLifecycleSchema>;
export type ChatbotReporterMode = z.infer<typeof ChatbotReporterModeSchema>;
export type ChatbotSlot = z.infer<typeof ChatbotSlotSchema>;
export type ChatbotDraft = z.infer<typeof ChatbotDraftSchema>;
export type ChatbotActiveReport = z.infer<typeof ChatbotActiveReportSchema>;
export type ChatbotResponse = z.infer<typeof ChatbotResponseSchema>;
export type ChatbotStatus = z.infer<typeof ChatbotStatusResponseSchema>['data'];

export interface PersistedChatbotState {
  lifecycle: ChatbotLifecycle;
  reporterMode: ChatbotReporterMode;
  ownerId: string | null;
  submissionId: string | null;
  draft: ChatbotDraft;
  activeReport: ChatbotActiveReport | null;
  editTarget: ChatbotSlot | null;
}

const numberWords: Record<string, number> = {
  one: 1, isa: 1, two: 2, dalawa: 2, three: 3, tatlo: 3,
  four: 4, apat: 4, five: 5, lima: 5, six: 6, anim: 6,
  seven: 7, pito: 7, eight: 8, walo: 8, nine: 9, siyam: 9,
  ten: 10, sampu: 10,
};

export function parseExactPeopleInput(value: string): number | null {
  const normalized = value.trim().toLowerCase()
    .replace(/^(?:actually|correction:?|sorry,?|make that)\s+(?:it(?:'s| is)\s+)?/, '')
    .replace(/\s+pala$/, '')
    .trim();
  if (numberWords[normalized]) return numberWords[normalized];
  if (!/^\d{1,3}$/.test(normalized)) return null;
  const count = Number(normalized);
  return count >= 1 && count <= 999 ? count : null;
}

export function isValidGuestPhone(value: string | undefined): boolean {
  return /^(?:\+63|0)9\d{9}$/.test((value ?? '').replace(/[\s()-]/g, ''));
}

export function isWithinBaliwag(latitude: number, longitude: number): boolean {
  return latitude >= 14.9 && latitude <= 15.05 && longitude >= 120.8 && longitude <= 121;
}

export function getNextMissingSlot(draft: ChatbotDraft, reporterMode: ChatbotReporterMode): ChatbotSlot {
  if (!draft.photoUri) return 'evidence';
  if (!draft.incidentType || !draft.nature) return 'incidentType';
  if (reporterMode === 'guest' && !isValidGuestPhone(draft.contactNumber)) return 'contactNumber';
  const hasCoordinates = draft.latitude !== undefined
    && draft.longitude !== undefined
    && isWithinBaliwag(draft.latitude, draft.longitude);
  const hasRequiredLandmark = reporterMode === 'registered' || (draft.landmarks?.trim().length ?? 0) >= 5;
  if (!hasCoordinates || !hasRequiredLandmark) return 'location';
  if (!draft.peopleInvolved) return 'peopleInvolved';
  if (!draft.victimCondition) return 'victimCondition';
  return 'review';
}

export function isReportProgressVisible(lifecycle: ChatbotLifecycle): boolean {
  return lifecycle === 'DRAFT' || lifecycle === 'SUBMITTING';
}

export function deriveMobileIntakePhase(
  draft: ChatbotDraft,
  reporterMode: ChatbotReporterMode,
  lifecycle: ChatbotLifecycle,
): 1 | 2 | 3 | 4 | 5 | null {
  if (!isReportProgressVisible(lifecycle)) return null;
  if (lifecycle === 'SUBMITTING') return 5;
  const nextSlot = getNextMissingSlot(draft, reporterMode);
  if (nextSlot === 'evidence' || nextSlot === 'incidentType') return 1;
  if (nextSlot === 'contactNumber' || nextSlot === 'location') return 2;
  if (nextSlot === 'peopleInvolved' || nextSlot === 'victimCondition') return 3;
  return 4;
}

export function createInitialChatbotState(reporterMode: ChatbotReporterMode = 'registered', ownerId: string | null = null): PersistedChatbotState {
  return {
    lifecycle: 'IDLE',
    reporterMode,
    ownerId,
    submissionId: null,
    draft: {},
    activeReport: null,
    editTarget: null,
  };
}

const PersistedStateSchema = z.object({
  lifecycle: ChatbotLifecycleSchema,
  reporterMode: ChatbotReporterModeSchema,
  ownerId: z.string().min(1).nullable(),
  submissionId: ChatbotSubmissionIdSchema.nullable(),
  draft: ChatbotDraftSchema,
  activeReport: ChatbotActiveReportSchema.nullable(),
  editTarget: ChatbotSlotSchema.nullable(),
}).strict();

export function restorePersistedChatbotState(value: unknown): PersistedChatbotState {
  const parsed = PersistedStateSchema.safeParse(value);
  if (!parsed.success) return createInitialChatbotState();
  const state = parsed.data;
  if (state.lifecycle !== 'IDLE' && !state.ownerId) return createInitialChatbotState(state.reporterMode);
  if ((state.lifecycle === 'DRAFT' || state.lifecycle === 'SUBMITTING') && !state.submissionId) {
    return createInitialChatbotState(state.reporterMode);
  }
  if (state.lifecycle === 'SUBMITTED_PENDING' || state.lifecycle === 'ACTIVE_RESPONSE') {
    if (!state.activeReport || !state.submissionId || state.activeReport.id !== state.submissionId) {
      return createInitialChatbotState(state.reporterMode);
    }
  }
  return state.lifecycle === 'SUBMITTING' ? { ...state, lifecycle: 'DRAFT' } : state;
}
