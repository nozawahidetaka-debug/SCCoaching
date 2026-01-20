import { create } from 'zustand';

export type Phase = 'intro' | 'journey1' | 'journey2' | 'journey3' | 'journey4' | 'extract_journey1' | 'extract_journey2' | 'extract_journey3' | 'extract_journey4' | 'summary' | 'reflection';

export interface DialogueEntry {
  question: string;
  answer: string;
  timestamp: number;
}

interface Variables {
  A: string; // したいこと
  B: string; // できないこと
}

interface SessionState {
  phase: Phase;
  variables: Variables;
  currentCycle: number;
  history: Record<string, DialogueEntry[]>;
  insights: string[];

  setPhase: (phase: Phase) => void;
  setVariables: (vars: Partial<Variables>) => void;
  addHistory: (journeyKey: string, entry: DialogueEntry) => void;
  addInsight: (insight: string) => void;
  incrementCycle: () => void;
  resetCycle: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  phase: 'intro',
  variables: { A: '', B: '' },
  currentCycle: 0,
  history: {
    journey1: [],
    journey2: [],
    journey3: [],
    journey4: [],
  },
  insights: [],

  setPhase: (phase) => set({ phase }),
  setVariables: (vars) => set((state) => ({ variables: { ...state.variables, ...vars } })),
  addHistory: (journeyKey, entry) => set((state) => ({
    history: {
      ...state.history,
      [journeyKey]: [...(state.history[journeyKey] || []), entry]
    }
  })),
  addInsight: (insight) => set((state) => ({ insights: [...state.insights, insight] })),
  incrementCycle: () => set((state) => ({ currentCycle: state.currentCycle + 1 })),
  resetCycle: () => set({ currentCycle: 0 }),
}));
