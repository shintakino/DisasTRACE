interface NotificationResponseConsumptionOptions {
  responseId: string;
  persistHandledResponseId: (responseId: string) => Promise<void>;
  clearNativeResponse: () => Promise<void>;
}

/**
 * Makes a notification response non-replayable before navigation starts.
 * Either durable marker is sufficient: SecureStore suppresses the same ID on
 * restart, while clearing Expo's native response removes the launch payload.
 */
export async function consumeNotificationResponseDurably({
  responseId,
  persistHandledResponseId,
  clearNativeResponse,
}: NotificationResponseConsumptionOptions): Promise<boolean> {
  const [persisted, cleared] = await Promise.allSettled([
    persistHandledResponseId(responseId),
    clearNativeResponse(),
  ]);

  return persisted.status === 'fulfilled' || cleared.status === 'fulfilled';
}
