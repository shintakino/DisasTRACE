import { create } from 'zustand';

interface PushRegistrationState {
  ownerId: string | null;
  status: 'checking' | 'ready' | 'disabled' | 'retrying';
  message: string;
  retryVersion: number;
  retry: () => void;
}

export const usePushRegistrationStore = create<PushRegistrationState>(set => ({
  ownerId: null,
  status: 'checking',
  message: 'Checking phone alert setup…',
  retryVersion: 0,
  retry: () => set(state => ({ retryVersion: state.retryVersion + 1 })),
}));
