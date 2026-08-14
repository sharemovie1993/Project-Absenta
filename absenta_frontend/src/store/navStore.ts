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
      activeWorkspaceId: 'WALIKELAS_WORKSPACE',
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
      detectHubFromPath: (path) => {
        const p = path.toLowerCase();
        
        if (p.startsWith('/bpbk')) {
          set({ activeHub: 'BPBK', activeWorkspaceId: 'BPBK_WORKSPACE' });
        } else if (p.startsWith('/kurikulum')) {
          set({ activeHub: 'KURIKULUM', activeWorkspaceId: 'KURIKULUM_WORKSPACE' });
        } else if (p.startsWith('/kesiswaan')) {
          set({ activeHub: 'KESISWAAN', activeWorkspaceId: 'KESISWAAN_WORKSPACE' });
        } else if (p.startsWith('/academic') || p.startsWith('/data-master') || p.startsWith('/master')) {
          set({ activeHub: 'AKADEMIK', activeWorkspaceId: 'AKADEMIK_WORKSPACE' });
        } else if (p.startsWith('/attendance')) {
          set({ activeHub: 'ABSENSI' });
        } else if (p.startsWith('/sarpras') || p.includes('asset')) {
          set({ activeHub: 'SARPRAS', activeWorkspaceId: 'SARPRAS_WORKSPACE' });
        } else if (p.startsWith('/hubin') || p.startsWith('/pkl') || p.includes('mitra')) {
          set({ activeHub: 'HUBIN', activeWorkspaceId: 'HUBIN_WORKSPACE' });
        } else if (p.startsWith('/cooperative') || p.includes('koperasi') || p.includes('kantin')) {
          set({ activeHub: 'KOPERASI', activeWorkspaceId: 'KOPERASI_WORKSPACE' });
        } else if (p.startsWith('/correspondence') || p.includes('persuratan') || p.includes('surat')) {
          set({ activeHub: 'PERSURATAN', activeWorkspaceId: 'TU_PERSURATAN_WORKSPACE' });
        } else if (p.startsWith('/rapor')) {
          set({ activeHub: 'RAPOR', activeWorkspaceId: 'WALIKELAS_WORKSPACE' });
        }
      },
    }),
    {
      name: 'absenta-nav-storage',
    }
  )
);
