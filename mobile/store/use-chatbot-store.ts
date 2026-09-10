import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import {
  type ChatbotActiveReport,
  type ChatbotDraft,
  type ChatbotLifecycle,
  type ChatbotReporterMode,
  type ChatbotSlot,
  createInitialChatbotState,
  restorePersistedChatbotState,
} from '../lib/chatbot-contracts';

const STORAGE_KEY = 'disastrace-chatbot-state-v1';

const secureStorage: StateStorage = {
  getItem: (name) => SecureStore.getItemAsync(name),
  setItem: (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: (name) => SecureStore.deleteItemAsync(name),
};

function createSubmissionId(): string {
  const bytes = new Uint8Array(16);
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

interface ChatbotStore {
  lifecycle: ChatbotLifecycle;
  reporterMode: ChatbotReporterMode;
  ownerId: string | null;
  submissionId: string | null;
  draft: ChatbotDraft;
  activeReport: ChatbotActiveReport | null;
  editTarget: ChatbotSlot | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setActor: (mode: ChatbotReporterMode, ownerId: string) => void;
  startDraft: (updates?: Partial<ChatbotDraft>) => void;
  updateDraft: (updates: Partial<ChatbotDraft>) => void;
  setEditTarget: (slot: ChatbotSlot | null) => void;
  markSubmitting: (imageUrl?: string) => void;
  restoreDraftAfterFailure: () => void;
  markSubmitted: (report: ChatbotActiveReport) => void;
  updateActiveReport: (updates: Partial<ChatbotActiveReport>) => void;
  markActiveResponse: () => void;
  discardDraft: () => void;
  clearReportToIdle: () => void;
}

export const useChatbotStore = create<ChatbotStore>()(
  persist(
    (set) => ({
      ...createInitialChatbotState(),
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setActor: (reporterMode, ownerId) => set((state) => (
        state.lifecycle === 'IDLE' && !state.activeReport ? { reporterMode, ownerId } : state
      )),
      startDraft: (updates = {}) => set((state) => {
        if (state.activeReport) return state;
        return {
          lifecycle: 'DRAFT',
          submissionId: state.submissionId ?? createSubmissionId(),
          draft: { ...state.draft, ...updates },
          editTarget: null,
        };
      }),
      updateDraft: (updates) => set((state) => ({ draft: { ...state.draft, ...updates } })),
      setEditTarget: (editTarget) => set({ editTarget }),
      markSubmitting: (imageUrl) => set((state) => ({
        lifecycle: 'SUBMITTING',
        draft: imageUrl ? { ...state.draft, imageUrl } : state.draft,
        editTarget: null,
      })),
      restoreDraftAfterFailure: () => set((state) => ({
        lifecycle: state.activeReport ? state.lifecycle : 'DRAFT',
      })),
      markSubmitted: (activeReport) => set({
        lifecycle: activeReport.hasIncident ? 'ACTIVE_RESPONSE' : 'SUBMITTED_PENDING',
        activeReport,
        editTarget: null,
      }),
      updateActiveReport: (updates) => set((state) => {
        if (!state.activeReport) return state;
        const activeReport = { ...state.activeReport, ...updates };
        return {
          activeReport,
          lifecycle: updates.hasIncident === undefined
            ? state.lifecycle
            : activeReport.hasIncident ? 'ACTIVE_RESPONSE' : 'SUBMITTED_PENDING',
        };
      }),
      markActiveResponse: () => set({ lifecycle: 'ACTIVE_RESPONSE' }),
      discardDraft: () => set((state) => ({
        ...createInitialChatbotState(state.reporterMode, state.ownerId),
        hasHydrated: state.hasHydrated,
      })),
      clearReportToIdle: () => set((state) => ({
        ...createInitialChatbotState(state.reporterMode, state.ownerId),
        hasHydrated: state.hasHydrated,
      })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        lifecycle: state.lifecycle,
        reporterMode: state.reporterMode,
        ownerId: state.ownerId,
        submissionId: state.submissionId,
        draft: state.draft,
        activeReport: state.activeReport,
        editTarget: state.editTarget,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...restorePersistedChatbotState(persisted),
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
