import { create } from 'zustand';

export type ResponderDutyStatus = 'OFF_DUTY' | 'ON_DUTY' | 'ACTIVE_DISPATCH';

interface ResponderDutyState {
  dutyStatus: ResponderDutyStatus;
  setDutyStatus: (dutyStatus: string | null | undefined) => void;
}

function normalizeDutyStatus(value: string | null | undefined): ResponderDutyStatus {
  return value === 'ON_DUTY' || value === 'ACTIVE_DISPATCH' ? value : 'OFF_DUTY';
}

// Availability is shared by the Profile action and the always-mounted tab
// tracker. It avoids depending on one Realtime callback before heartbeats run.
export const useResponderDutyStore = create<ResponderDutyState>((set) => ({
  dutyStatus: 'OFF_DUTY',
  setDutyStatus: (dutyStatus) => set({ dutyStatus: normalizeDutyStatus(dutyStatus) }),
}));
