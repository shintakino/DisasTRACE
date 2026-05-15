import { create } from 'zustand';
import { SignUpPayloadType } from '../schemas/auth';

type PartialSignUpPayload = Partial<SignUpPayloadType>;

interface SignUpState {
  data: PartialSignUpPayload;
  updateData: (stepData: PartialSignUpPayload) => void;
  reset: () => void;
}

export const useSignUpStore = create<SignUpState>((set) => ({
  data: {},
  updateData: (stepData) => set((state) => ({ data: { ...state.data, ...stepData } })),
  reset: () => set({ data: {} }),
}));
