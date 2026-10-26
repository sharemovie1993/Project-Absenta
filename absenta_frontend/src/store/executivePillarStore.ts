import { create } from 'zustand';

export type ExecutivePillar = 'ringkasan' | 'kbm' | 'kesiswaan' | 'bk' | 'sarpras' | 'hubin' | 'tu';

interface ExecutivePillarState {
  currentPillar: ExecutivePillar;
  setPillar: (pillar: ExecutivePillar) => void;
}

export const useExecutivePillarStore = create<ExecutivePillarState>((set) => ({
  currentPillar: 'ringkasan',
  setPillar: (pillar) => set({ currentPillar: pillar }),
}));

