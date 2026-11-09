import { create } from 'zustand';

interface RoleDashboardSwitcherState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useRoleDashboardSwitcherStore = create<RoleDashboardSwitcherState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
