import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

const HISTORY_FILE = `${FileSystem.documentDirectory}disastrace-guest-report-history-v1.json`;
const TOKEN_PREFIX = 'disastrace-guest-report-token-v1:';
const MAX_HISTORY = 10;
const MAX_MESSAGES = 40;

export interface GuestHistoryMessage {
  role: 'bot' | 'user';
  text: string;
}

export interface GuestReportHistoryEntry {
  id: string;
  displayId: string;
  incidentType: string;
  status: string;
  responseStatus: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  reportsRemaining?: number;
  messages: GuestHistoryMessage[];
}

let writeQueue = Promise.resolve();

async function readEntries(): Promise<GuestReportHistoryEntry[]> {
  try {
    const info = await FileSystem.getInfoAsync(HISTORY_FILE);
    if (!info.exists) return [];
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(HISTORY_FILE));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mutateEntries<T>(
  mutate: (entries: GuestReportHistoryEntry[]) => { entries: GuestReportHistoryEntry[]; result: T },
) {
  const operation = writeQueue.then(async () => {
    const current = await readEntries();
    const next = mutate(current);
    await FileSystem.writeAsStringAsync(HISTORY_FILE, JSON.stringify(next.entries));
    return next.result;
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export async function listGuestReportHistory() {
  await writeQueue;
  return readEntries();
}

export async function archiveGuestReport(input: GuestReportHistoryEntry & { accessToken?: string }) {
  const { accessToken, ...historyEntry } = input;
  const removed = await mutateEntries((entries) => {
    const next = [
      { ...historyEntry, messages: historyEntry.messages.slice(-MAX_MESSAGES) },
      ...entries.filter((entry) => entry.id !== input.id),
    ].slice(0, MAX_HISTORY);
    return { entries: next, result: entries.filter((entry) => !next.some((kept) => kept.id === entry.id)) };
  });
  if (accessToken) await SecureStore.setItemAsync(`${TOKEN_PREFIX}${input.id}`, accessToken);
  for (const entry of removed) {
    await SecureStore.deleteItemAsync(`${TOKEN_PREFIX}${entry.id}`).catch(() => undefined);
  }
}

export async function appendGuestReportMessages(id: string, messages: GuestHistoryMessage[]) {
  if (messages.length === 0) return;
  await mutateEntries((entries) => ({
    entries: entries.map((entry) => entry.id === id
      ? {
          ...entry,
          messages: [...entry.messages, ...messages].slice(-MAX_MESSAGES),
          updatedAt: new Date().toISOString(),
        }
      : entry),
    result: undefined,
  }));
}

export async function updateGuestReportHistory(id: string, updates: Partial<GuestReportHistoryEntry>) {
  await mutateEntries((entries) => ({
    entries: entries.map((entry) => entry.id === id
      ? { ...entry, ...updates, id: entry.id, updatedAt: new Date().toISOString() }
      : entry),
    result: undefined,
  }));
}

export async function getGuestReportAccessToken(id: string) {
  return SecureStore.getItemAsync(`${TOKEN_PREFIX}${id}`);
}

export async function removeGuestReportHistory(id: string) {
  await mutateEntries((entries) => ({ entries: entries.filter((entry) => entry.id !== id), result: undefined }));
  await SecureStore.deleteItemAsync(`${TOKEN_PREFIX}${id}`).catch(() => undefined);
}
