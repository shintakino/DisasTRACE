const DRAFT_REMINDER_NOTIFICATION_KEY = 'disas_trace_draft_reminder_notification_id';

export function draftReminderKeyForResponder(responderId: string) {
  return `${DRAFT_REMINDER_NOTIFICATION_KEY}:${responderId}`;
}

export function shouldScheduleDraftReminder(input: {
  responderId: string | null | undefined;
  isOnline: boolean;
  draftCount: number;
}) {
  return Boolean(input.responderId) && input.isOnline && input.draftCount > 0;
}
