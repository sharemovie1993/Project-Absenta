import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TvState {
  isTvMode: boolean;
  setTvMode: (value: boolean) => void;
  toggleTvMode: () => void;
}

export const useTvStore = create<TvState>((set) => ({
  isTvMode: false,
  setTvMode: (value) => set({ isTvMode: value }),
  toggleTvMode: () => set((state) => ({ isTvMode: !state.isTvMode })),
}));
