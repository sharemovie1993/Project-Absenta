/**
 * StrukturConfig.ts
 * Centralized configuration for the Organizational Structure module.
 * Use this to adjust design tokens, colors, and abbreviations without touching JSX.
 */

export const STRUKTUR_CONFIG = {
  // Design Tokens
  design: {
    animations: {
      spring: { type: "spring", stiffness: 300, damping: 30 },
      fade: { duration: 0.2 },
      pulse: "animate-pulse",
      bounce: "animate-bounce",
    },
    shadows: {
      ambient: "ring-4 ring-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]",
      editing: "bg-white dark:bg-slate-900 border-2 border-amber-500 shadow-2xl scale-[1.02] z-[500]",
    },
    indicators: {
      editing: {
        wrapper: "absolute -top-10 left-0 right-0 flex justify-center pointer-events-none z-50",
        badge: "bg-amber-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg uppercase tracking-widest border-2 border-white whitespace-nowrap",
      },
      addMember: {
        wrapper: "mt-6 flex justify-center w-full",
        button: "w-10 h-10 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-400 text-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-110 active:scale-95 transition-all cursor-pointer ring-4 ring-blue-500/10",
      }
    },
    leadership: {
      minHeight: '70px',
      minWidth: '200px',
      maxWidth: '260px',
      rounded: 'rounded-none',
      colors: {
        top: 'bg-indigo-600 dark:bg-indigo-500',
        bottom: 'bg-slate-50 dark:bg-slate-800/50',
        border: 'border-slate-200 dark:border-slate-700',
        textTop: 'text-white',
        textBottom: 'text-slate-700 dark:text-slate-200',
      },
    },
    member: {
      minHeight: '52px',
      minWidth: '200px',
      rounded: 'rounded-xl',
      colors: {
        bg: 'bg-white dark:bg-slate-900',
        border: 'border-slate-200 dark:border-slate-800',
        textPrimary: 'text-slate-700 dark:text-slate-300',
        textSecondary: 'text-slate-600 dark:text-slate-400',
      },
    },
    unassigned: {
      colors: {
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-white dark:bg-slate-900',
        border: 'border-blue-200 dark:border-blue-800',
      },
    },
    group: {
      minHeight: '64px',
      colors: {
        bg: 'bg-gradient-to-r from-indigo-900 to-slate-900',
        text: 'text-white',
      },
    },
  } as const,

  // Position Abbreviation Dictionary
  abbreviations: {
    'WAKIL KEPALA SEKOLAH': 'WAKA',
    'KEPALA SEKOLAH': 'KEPSEK',
    'KURIKULUM': 'KUR.',
    'KESISWAAN': 'KES.',
    'SARANA PRASARANA': 'SARPRAS',
    'HUBUNGAN INDUSTRI': 'HUBIN',
    'HUBUNGAN MASYARAKAT': 'HUMAS',
    'WALIKELAS': 'WALI KELAS',
    'PETUGAS ABSENSI KELAS': 'ABSENSI',
    'PETUGAS_KELAS': 'ABSENSI',
    '& STAF': '',
    '& STAFF': '',
  } as const,
};

/**
 * Utility to shorten position titles based on the config dictionary.
 */
export const shortenPosition = (text: string): string => {
  let shortened = text;
  Object.entries(STRUKTUR_CONFIG.abbreviations).forEach(([key, value]) => {
    const regex = new RegExp(key, 'gi');
    shortened = shortened.replace(regex, value);
  });
  return shortened.trim();
};
