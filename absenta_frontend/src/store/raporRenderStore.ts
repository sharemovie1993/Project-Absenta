import { create } from 'zustand';
import { playNotificationSound } from '../utils/audioUtils';

export type RaporRenderStage = 'idle' | 'fetching' | 'processing' | 'rendering' | 'ready' | 'error';

export interface RaporRenderState {
  isOpen: boolean;
  title: string;
  stage: RaporRenderStage;
  stageText: string;
  progressPercent: number;
  current: number;
  total: number;
  detail?: string;
  blobUrl?: string | null;
  filename?: string;
  errorMessage?: string;

  // Actions
  startRender: (title: string, total?: number, initialStageText?: string) => void;
  updateProgress: (options: {
    stage?: RaporRenderStage;
    stageText?: string;
    progressPercent?: number;
    current?: number;
    total?: number;
    detail?: string;
  }) => void;
  finishRender: (blobUrl: string, filename: string, stageText?: string) => void;
  failRender: (errorMessage: string) => void;
  closeModal: () => void;
}

export const useRaporRenderStore = create<RaporRenderState>((set, get) => ({
  isOpen: false,
  title: '',
  stage: 'idle',
  stageText: '',
  progressPercent: 0,
  current: 0,
  total: 0,
  detail: undefined,
  blobUrl: null,
  filename: undefined,
  errorMessage: undefined,

  startRender: (title: string, total = 1, initialStageText = 'Menyiapkan proses rendering...') => {
    // Revoke previous blobUrl if any to prevent memory leaks
    const currentBlob = get().blobUrl;
    if (currentBlob) {
      try {
        window.URL.revokeObjectURL(currentBlob);
      } catch {
        // Ignore revoke errors
      }
    }

    set({
      isOpen: true,
      title,
      stage: 'fetching',
      stageText: initialStageText,
      progressPercent: 10,
      current: 0,
      total,
      detail: undefined,
      blobUrl: null,
      filename: undefined,
      errorMessage: undefined,
    });
  },

  updateProgress: ({ stage, stageText, progressPercent, current, total, detail }) => {
    set((state) => ({
      stage: stage ?? state.stage,
      stageText: stageText ?? state.stageText,
      progressPercent: typeof progressPercent === 'number' ? progressPercent : state.progressPercent,
      current: typeof current === 'number' ? current : state.current,
      total: typeof total === 'number' ? total : state.total,
      detail: detail !== undefined ? detail : state.detail,
    }));
  },

  finishRender: (blobUrl: string, filename: string, stageText = 'Dokumen PDF berhasil dirender!') => {
    // Play celebratory notification chime
    try {
      playNotificationSound();
    } catch {
      // Audio playback safely ignored if blocked
    }

    set({
      isOpen: true,
      stage: 'ready',
      stageText,
      progressPercent: 100,
      blobUrl,
      filename,
      errorMessage: undefined,
    });

    // Proactive automatic preview attempt in new tab
    if (blobUrl) {
      let openedTab: Window | null = null;
      try {
        openedTab = window.open(blobUrl, '_blank');
      } catch {
        // Pop-up blocked by browser
      }

      // Jika tab baru berhasil dibuka otomatis:
      // Beri animasi sukses 100% sejenak (800ms), lalu tutup modal secara otomatis.
      // Ini mencegah modal menggantung di tab utama saat pengguna kembali dari tab PDF.
      if (openedTab) {
        setTimeout(() => {
          if (get().isOpen && get().stage === 'ready') {
            set({
              isOpen: false,
              stage: 'idle',
            });
          }
        }, 800);
      }
    }
  },

  failRender: (errorMessage: string) => {
    set({
      stage: 'error',
      stageText: 'Gagal memproses pembuatan dokumen PDF.',
      errorMessage,
    });
  },

  closeModal: () => {
    const currentBlob = get().blobUrl;
    if (currentBlob) {
      // Tunda revoke blob URL selama 60 detik agar tab PDF yang sedang terbuka tidak mendadak error
      setTimeout(() => {
        try {
          window.URL.revokeObjectURL(currentBlob);
        } catch {
          // Ignore
        }
      }, 60000);
    }
    set({
      isOpen: false,
      stage: 'idle',
      blobUrl: null,
    });
  },
}));
