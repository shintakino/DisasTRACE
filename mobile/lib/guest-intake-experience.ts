import { getNextMissingSlot, sanitizeGuestPhoneInput, type ChatbotDraft, type ChatbotReporterMode } from './chatbot-contracts';

export const normalizeGuestPhoneInput = sanitizeGuestPhoneInput;

export function reporterHomeRoute(mode: ChatbotReporterMode) {
  return mode === 'guest' ? '/' as const : '/(tabs)' as const;
}

export function deriveGuestReportAllowance(limit: number, phoneUsed: number, deviceUsed: number) {
  const used = Math.max(0, phoneUsed, deviceUsed);
  return { limit, used, remaining: Math.max(0, limit - used) };
}

const SLOT_LABELS: Record<string, string> = {
  evidence: 'Photo evidence',
  incidentType: 'Incident type',
  contactNumber: 'Callback number',
  location: 'GPS location',
  peopleInvolved: 'People involved',
  victimCondition: 'Victim condition',
};

export function validateGuestDraftForSubmission(draft: ChatbotDraft, reporterMode: ChatbotReporterMode) {
  const missingFields: string[] = [];
  if (!draft.photoUri) missingFields.push(SLOT_LABELS.evidence);
  if (!draft.incidentType || !draft.nature) missingFields.push(SLOT_LABELS.incidentType);
  if (reporterMode === 'guest' && !draft.contactNumber) missingFields.push(SLOT_LABELS.contactNumber);
  if (draft.latitude === undefined || draft.longitude === undefined) missingFields.push(SLOT_LABELS.location);
  if (reporterMode === 'guest' && (draft.landmarks?.trim().length ?? 0) < 5) missingFields.push('Nearby landmark');
  if (!draft.peopleInvolved) missingFields.push(SLOT_LABELS.peopleInvolved);
  if (!draft.victimCondition) missingFields.push(SLOT_LABELS.victimCondition);
  return { valid: getNextMissingSlot(draft, reporterMode) === 'review', missingFields };
}

export function mergeBoundedGuestHistoryIds(existing: string[], id: string, limit: number) {
  return [id, ...existing.filter((item) => item !== id)].slice(0, limit);
}

export function mergeBoundedGuestMessages<T extends { id: string }>(existing: T[], incoming: T[], limit: number) {
  const byId = new Map([...existing, ...incoming].map((message) => [message.id, message]));
  return [...byId.values()].slice(-limit);
}
