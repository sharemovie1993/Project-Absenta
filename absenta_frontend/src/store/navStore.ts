import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type HubType = 'AKADEMIK' | 'KURIKULUM' | 'KESISWAAN' | 'ABSENSI' | 'SARPRAS' | 'HUBIN' | 'KOPERASI' | 'BPBK' | 'RAPOR' | 'CBT' | 'PERSURATAN';

interface NavState {
  activeHub: HubType;
  setActiveHub: (hub: HubType) => void;
  activeWorkspaceId: string;
  setActiveWorkspaceId: (id: string) => void;
  detectHubFromPath: (path: string) => void;
}

export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      activeHub: 'AKADEMIK',
      setActiveHub: (hub) => set({ activeHub: hub }),
      activeWorkspaceId: 'TEACHER_WORKSPACE',
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
      detectHubFromPath: (path) => {
        const p = path.toLowerCase();
        
        if (p.startsWith('/bpbk')) {
          set({ activeHub: 'BPBK' });
        } else if (p.startsWith('/kurikulum')) {
          set({ activeHub: 'KURIKULUM' });
        } else if (p.startsWith('/kesiswaan')) {
          set({ activeHub: 'KESISWAAN' });
        } else if (p.startsWith('/academic') || p.startsWith('/data-master') || p.startsWith('/master')) {
          set({ activeHub: 'AKADEMIK' });
        } else if (p.startsWith('/attendance')) {
          set({ activeHub: 'ABSENSI' });
        } else if (p.startsWith('/sarpras') || p.includes('asset')) {
          set({ activeHub: 'SARPRAS' });
        } else if (p.startsWith('/hubin') || p.startsWith('/pkl') || p.includes('mitra')) {
          set({ activeHub: 'HUBIN' });
        } else if (p.startsWith('/cooperative') || p.includes('koperasi') || p.includes('kantin')) {
          set({ activeHub: 'KOPERASI' });
        } else if (p.startsWith('/correspondence') || p.includes('persuratan') || p.includes('surat')) {
          set({ activeHub: 'PERSURATAN' });
        }
      },
    }),
    {
      name: 'absenta-nav-storage',
    }
  )
);
