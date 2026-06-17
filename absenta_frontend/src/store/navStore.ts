import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type HubType = 'AKADEMIK' | 'ABSENSI' | 'SARPRAS' | 'HUBIN' | 'KOPERASI' | 'MANAGEMENT';

interface NavState {
  activeHub: HubType;
  setActiveHub: (hub: HubType) => void;
  detectHubFromPath: (path: string) => void;
}

export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      activeHub: 'AKADEMIK',
      setActiveHub: (hub) => set({ activeHub: hub }),
      detectHubFromPath: (path) => {
        const p = path.toLowerCase();
        
        if (p.startsWith('/academic') || p.startsWith('/kesiswaan') || p.startsWith('/kurikulum')) {
          set({ activeHub: 'AKADEMIK' });
        } else if (p.startsWith('/attendance')) {
          set({ activeHub: 'ABSENSI' });
        } else if (p.startsWith('/sarpras') || p.includes('asset')) {
          set({ activeHub: 'SARPRAS' });
        } else if (p.startsWith('/hubin') || p.startsWith('/pkl') || p.includes('mitra')) {
          set({ activeHub: 'HUBIN' });
        } else if (p.startsWith('/billing') || p.startsWith('/invoice') || p.includes('tagihan') || p.includes('spp')) {
          if (!(p.includes('subscription') || p.includes('services'))) {
            set({ activeHub: 'KOPERASI' });
          }
        } else if (p.startsWith('/cooperative') || p.includes('koperasi') || p.includes('kantin')) {
          set({ activeHub: 'KOPERASI' });
        }
        // SISTEM detection removed to keep it persistent at the bottom
      },
    }),
    {
      name: 'absenta-nav-storage',
    }
  )
);
