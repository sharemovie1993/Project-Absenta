// ─── Struktur Kurikulum Theme System ─────────────────────────────────────────
// Konstanta dan helper tema warna untuk kartu Jurusan (SMK/MAK).
// Dipisah dari halaman utama untuk mengurangi ukuran berkas (Pilar 21B).

export interface ThemePalette {
  color: string;
  activeTab: string;
  inactiveTab: string;
  border: string;
  bg: string;
  ring: string;
  text: string;
  bgDecorative: string;
  badgeClass: string;
  baseBg: string;
  baseBorder: string;
  baseText: string;
  baseBgDecorative: string;
  baseBadgeClass: string;
  borderDivider: string;
  borderDividerBase: string;
  // Dynamic resolved fields
  solidBg?: string;
  softBg?: string;
  badgeActive?: string;
  badgeInactive?: string;
  cardTextActive?: string;
  cardTextInactive?: string;
  cardSubtextActive?: string;
  cardSubtextInactive?: string;
  cardDividerActive?: string;
  cardDividerInactive?: string;
  iconActive?: string;
  iconInactive?: string;
  cardBg?: string;
}

export interface Jurusan {
  id: string;
  nama: string;
  kode?: string;
  singkatan?: string;
  warna?: string;
}

export const THEME_PALETTES: ThemePalette[] = [
  {
    color: 'blue',
    activeTab: 'bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-none',
    inactiveTab: 'bg-blue-50/40 hover:bg-blue-100/70 text-blue-600 dark:bg-blue-950/15 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30',
    border: 'border-blue-600 dark:border-blue-500',
    bg: 'bg-blue-100/50 dark:bg-blue-950/40',
    ring: 'ring-blue-500/20',
    text: 'text-blue-700 dark:text-blue-300 font-extrabold',
    bgDecorative: 'bg-blue-500/15',
    badgeClass: 'bg-blue-600 dark:bg-blue-500 text-white border-transparent',
    baseBg: 'bg-blue-50/20 dark:bg-blue-950/10 hover:bg-blue-50/45 dark:hover:bg-blue-950/20',
    baseBorder: 'border-blue-200/80 dark:border-blue-800/80 hover:border-blue-400 dark:hover:border-blue-600',
    baseText: 'text-blue-500 dark:text-blue-400',
    baseBgDecorative: 'bg-blue-500/5',
    baseBadgeClass: 'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-transparent',
    borderDivider: 'border-blue-200/60 dark:border-blue-800/40',
    borderDividerBase: 'border-blue-100/30 dark:border-blue-950/20',
  },
  {
    color: 'cyan',
    activeTab: 'bg-cyan-600 text-white shadow-sm shadow-cyan-200 dark:shadow-none',
    inactiveTab: 'bg-cyan-50/40 hover:bg-cyan-100/70 text-cyan-600 dark:bg-cyan-950/15 dark:text-cyan-400 border border-cyan-100/50 dark:border-cyan-900/30',
    border: 'border-cyan-600 dark:border-cyan-500',
    bg: 'bg-cyan-100/50 dark:bg-cyan-950/40',
    ring: 'ring-cyan-500/20',
    text: 'text-cyan-700 dark:text-cyan-300 font-extrabold',
    bgDecorative: 'bg-cyan-500/15',
    badgeClass: 'bg-cyan-600 dark:bg-cyan-500 text-white border-transparent',
    baseBg: 'bg-cyan-50/20 dark:bg-cyan-950/10 hover:bg-cyan-50/45 dark:hover:bg-cyan-950/20',
    baseBorder: 'border-cyan-200/80 dark:border-cyan-800/80 hover:border-cyan-400 dark:hover:border-cyan-600',
    baseText: 'text-cyan-500 dark:text-cyan-400',
    baseBgDecorative: 'bg-cyan-500/5',
    baseBadgeClass: 'border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 bg-transparent',
    borderDivider: 'border-cyan-200/60 dark:border-cyan-800/40',
    borderDividerBase: 'border-cyan-100/30 dark:border-cyan-950/20',
  },
  {
    color: 'emerald',
    activeTab: 'bg-emerald-600 text-white shadow-sm shadow-emerald-200 dark:shadow-none',
    inactiveTab: 'bg-emerald-50/40 hover:bg-emerald-100/70 text-emerald-600 dark:bg-emerald-950/15 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30',
    border: 'border-emerald-600 dark:border-emerald-500',
    bg: 'bg-emerald-100/50 dark:bg-emerald-950/40',
    ring: 'ring-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-300 font-extrabold',
    bgDecorative: 'bg-emerald-500/15',
    badgeClass: 'bg-emerald-600 dark:bg-emerald-500 text-white border-transparent',
    baseBg: 'bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/45 dark:hover:bg-emerald-950/20',
    baseBorder: 'border-emerald-200/80 dark:border-emerald-800/80 hover:border-emerald-400 dark:hover:border-emerald-600',
    baseText: 'text-emerald-500 dark:text-emerald-400',
    baseBgDecorative: 'bg-emerald-500/5',
    baseBadgeClass: 'border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-transparent',
    borderDivider: 'border-emerald-200/60 dark:border-emerald-800/40',
    borderDividerBase: 'border-emerald-100/30 dark:border-emerald-950/20',
  },
  {
    color: 'amber',
    activeTab: 'bg-amber-600 text-white shadow-sm shadow-amber-200 dark:shadow-none',
    inactiveTab: 'bg-amber-50/40 hover:bg-amber-100/70 text-amber-600 dark:bg-amber-950/15 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30',
    border: 'border-amber-600 dark:border-amber-500',
    bg: 'bg-amber-100/50 dark:bg-amber-950/40',
    ring: 'ring-amber-500/20',
    text: 'text-amber-700 dark:text-amber-300 font-extrabold',
    bgDecorative: 'bg-amber-500/15',
    badgeClass: 'bg-amber-600 dark:bg-amber-500 text-white border-transparent',
    baseBg: 'bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/45 dark:hover:bg-amber-950/20',
    baseBorder: 'border-amber-200/80 dark:border-amber-800/80 hover:border-amber-400 dark:hover:border-amber-600',
    baseText: 'text-amber-500 dark:text-amber-400',
    baseBgDecorative: 'bg-amber-500/5',
    baseBadgeClass: 'border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 bg-transparent',
    borderDivider: 'border-amber-200/60 dark:border-amber-800/40',
    borderDividerBase: 'border-amber-100/30 dark:border-amber-950/20',
  },
  {
    color: 'orange',
    activeTab: 'bg-orange-600 text-white shadow-sm shadow-orange-200 dark:shadow-none',
    inactiveTab: 'bg-orange-50/40 hover:bg-orange-100/70 text-orange-600 dark:bg-orange-950/15 dark:text-orange-400 border border-orange-100/50 dark:border-orange-900/30',
    border: 'border-orange-600 dark:border-orange-500',
    bg: 'bg-orange-100/50 dark:bg-orange-950/40',
    ring: 'ring-orange-500/20',
    text: 'text-orange-700 dark:text-orange-300 font-extrabold',
    bgDecorative: 'bg-orange-500/15',
    badgeClass: 'bg-orange-600 dark:bg-orange-500 text-white border-transparent',
    baseBg: 'bg-orange-50/25 dark:bg-orange-950/10 hover:bg-orange-50/45 dark:hover:bg-orange-950/20',
    baseBorder: 'border-orange-200/80 dark:border-orange-900/40 hover:border-orange-400 dark:hover:border-orange-600',
    baseText: 'text-orange-500 dark:text-orange-400',
    baseBgDecorative: 'bg-orange-500/5',
    baseBadgeClass: 'border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 bg-transparent',
    borderDivider: 'border-orange-200/60 dark:border-orange-900/40',
    borderDividerBase: 'border-orange-100/30 dark:border-orange-950/20',
  },
  {
    color: 'rose',
    activeTab: 'bg-rose-600 text-white shadow-sm shadow-rose-200 dark:shadow-none',
    inactiveTab: 'bg-rose-50/40 hover:bg-rose-100/70 text-rose-600 dark:bg-rose-950/15 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30',
    border: 'border-rose-600 dark:border-rose-500',
    bg: 'bg-rose-100/50 dark:bg-rose-950/40',
    ring: 'ring-rose-500/20',
    text: 'text-rose-700 dark:text-rose-300 font-extrabold',
    bgDecorative: 'bg-rose-500/15',
    badgeClass: 'bg-rose-600 dark:bg-rose-500 text-white border-transparent',
    baseBg: 'bg-rose-50/25 dark:bg-rose-950/10 hover:bg-rose-50/45 dark:hover:bg-rose-950/20',
    baseBorder: 'border-rose-200/80 dark:border-rose-900/40 hover:border-rose-400 dark:hover:border-rose-600',
    baseText: 'text-rose-500 dark:text-rose-400',
    baseBgDecorative: 'bg-rose-500/5',
    baseBadgeClass: 'border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-transparent',
    borderDivider: 'border-rose-200/60 dark:border-rose-900/40',
    borderDividerBase: 'border-rose-100/30 dark:border-rose-950/20',
  },
  {
    color: 'pink',
    activeTab: 'bg-pink-600 text-white shadow-sm shadow-pink-200 dark:shadow-none',
    inactiveTab: 'bg-pink-50/40 hover:bg-pink-100/70 text-pink-600 dark:bg-pink-950/15 dark:text-pink-400 border border-pink-100/50 dark:border-pink-900/30',
    border: 'border-pink-600 dark:border-pink-500',
    bg: 'bg-pink-100/50 dark:bg-pink-950/40',
    ring: 'ring-pink-500/20',
    text: 'text-pink-700 dark:text-pink-300 font-extrabold',
    bgDecorative: 'bg-pink-500/15',
    badgeClass: 'bg-pink-600 dark:bg-pink-500 text-white border-transparent',
    baseBg: 'bg-pink-50/25 dark:bg-pink-950/10 hover:bg-pink-50/45 dark:hover:bg-pink-950/20',
    baseBorder: 'border-pink-200/80 dark:border-pink-900/40 hover:border-pink-400 dark:hover:border-pink-600',
    baseText: 'text-pink-500 dark:text-pink-400',
    baseBgDecorative: 'bg-pink-500/5',
    baseBadgeClass: 'border-pink-200 dark:border-pink-800 text-pink-600 dark:text-pink-400 bg-transparent',
    borderDivider: 'border-pink-200/60 dark:border-pink-900/40',
    borderDividerBase: 'border-pink-100/30 dark:border-pink-950/20',
  },
  {
    color: 'purple',
    activeTab: 'bg-purple-600 text-white shadow-sm shadow-purple-200 dark:shadow-none',
    inactiveTab: 'bg-purple-50/40 hover:bg-purple-100/70 text-purple-600 dark:bg-purple-950/15 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/30',
    border: 'border-purple-600 dark:border-purple-500',
    bg: 'bg-purple-100/50 dark:bg-purple-950/40',
    ring: 'ring-purple-500/20',
    text: 'text-purple-700 dark:text-purple-300 font-extrabold',
    bgDecorative: 'bg-purple-500/15',
    badgeClass: 'bg-purple-600 dark:bg-purple-500 text-white border-transparent',
    baseBg: 'bg-purple-50/25 dark:bg-purple-950/10 hover:bg-purple-50/45 dark:hover:bg-purple-950/20',
    baseBorder: 'border-purple-200/80 dark:border-purple-900/40 hover:border-purple-400 dark:hover:border-purple-600',
    baseText: 'text-purple-500 dark:text-purple-400',
    baseBgDecorative: 'bg-purple-500/5',
    baseBadgeClass: 'border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 bg-transparent',
    borderDivider: 'border-purple-200/60 dark:border-purple-900/40',
    borderDividerBase: 'border-purple-100/30 dark:border-indigo-950/20',
  },
  {
    color: 'teal',
    activeTab: 'bg-teal-600 text-white shadow-sm shadow-teal-200 dark:shadow-none',
    inactiveTab: 'bg-teal-50/40 hover:bg-teal-100/70 text-teal-600 dark:bg-teal-950/15 dark:text-teal-400 border border-teal-100/50 dark:border-teal-900/30',
    border: 'border-teal-600 dark:border-teal-500',
    bg: 'bg-teal-100/50 dark:bg-teal-950/40',
    ring: 'ring-teal-500/20',
    text: 'text-teal-700 dark:text-teal-300 font-extrabold',
    bgDecorative: 'bg-teal-500/15',
    badgeClass: 'bg-teal-600 dark:bg-teal-500 text-white border-transparent',
    baseBg: 'bg-teal-50/25 dark:bg-teal-950/10 hover:bg-teal-50/45 dark:hover:bg-teal-950/20',
    baseBorder: 'border-teal-200/80 dark:border-teal-900/40 hover:border-teal-400 dark:hover:border-teal-600',
    baseText: 'text-teal-500 dark:text-teal-400',
    baseBgDecorative: 'bg-teal-500/5',
    baseBadgeClass: 'border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 bg-transparent',
    borderDivider: 'border-teal-200/60 dark:border-teal-800/40',
    borderDividerBase: 'border-teal-100/30 dark:border-teal-950/20',
  },
  {
    color: 'indigo',
    activeTab: 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none',
    inactiveTab: 'bg-indigo-50/40 hover:bg-indigo-100/70 text-indigo-600 dark:bg-indigo-950/15 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30',
    border: 'border-indigo-600 dark:border-indigo-500',
    bg: 'bg-indigo-100/50 dark:bg-indigo-950/40',
    ring: 'ring-indigo-500/20',
    text: 'text-indigo-700 dark:text-indigo-300 font-extrabold',
    bgDecorative: 'bg-indigo-500/15',
    badgeClass: 'bg-indigo-600 dark:bg-indigo-500 text-white border-transparent',
    baseBg: 'bg-indigo-50/20 dark:bg-indigo-950/10 hover:bg-indigo-50/45 dark:hover:bg-indigo-950/20',
    baseBorder: 'border-indigo-200/80 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600',
    baseText: 'text-indigo-500 dark:text-indigo-400',
    baseBgDecorative: 'bg-indigo-500/5',
    baseBadgeClass: 'border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 bg-transparent',
    borderDivider: 'border-indigo-100 dark:border-indigo-900/40',
    borderDividerBase: 'border-indigo-100/30 dark:border-indigo-950/20',
  },
];

export const INDIGO_THEME = THEME_PALETTES[THEME_PALETTES.length - 1];

// ─── Theme resolver helpers ───────────────────────────────────────────────────

export function getThemeForMajor(code: string, id: string): ThemePalette {
  const key = id || code || '';
  if (!key) return INDIGO_THEME;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return THEME_PALETTES[Math.abs(hash) % THEME_PALETTES.length];
}

export function resolveMajorTheme(j: Jurusan): ThemePalette {
  if (j.warna?.startsWith('#')) {
    const hex = j.warna;
    const id  = j.id;
    return {
      color: hex,
      activeTab:        `major-tab-active-${id}`,
      inactiveTab:      `major-tab-inactive-${id}`,
      border:           `major-theme-border-${id}`,
      bg:               `major-theme-bg-${id}`,
      ring:             `major-theme-ring-${id}`,
      text:             `major-theme-text-${id}`,
      bgDecorative:     `major-theme-bg-dec-${id}`,
      badgeClass:       `major-theme-badge-${id}`,
      baseBg:           `major-theme-base-bg-${id}`,
      baseBorder:       `major-theme-base-border-${id}`,
      baseText:         `major-theme-base-text-${id}`,
      baseBgDecorative: `major-theme-base-bg-dec-${id}`,
      baseBadgeClass:   `major-theme-base-badge-${id}`,
      borderDivider:    `major-theme-divider-${id}`,
      borderDividerBase:`major-theme-divider-base-${id}`,
      solidBg:          `major-card-solid-active-${id}`,
      softBg:           `major-card-soft-inactive-${id}`,
      badgeActive:      `major-badge-active-${id}`,
      badgeInactive:    `major-badge-inactive-${id}`,
      cardTextActive:   `major-card-text-active-${id}`,
      cardTextInactive: `major-card-text-inactive-${id}`,
      cardSubtextActive:`major-card-subtext-active-${id}`,
      cardSubtextInactive:`major-card-subtext-inactive-${id}`,
      cardDividerActive:`major-card-divider-active-${id}`,
      cardDividerInactive:`major-card-divider-inactive-${id}`,
      iconActive:       `major-card-text-active-${id}`,
      iconInactive:     `major-card-text-inactive-${id}`,
      cardBg:           `major-card-bg-${id}`,
    };
  }

  let base = INDIGO_THEME;
  if (j.warna) {
    const found = THEME_PALETTES.find(p => p.color === j.warna!.toLowerCase());
    if (found) base = found;
  } else {
    base = getThemeForMajor(j.kode ?? '', j.id);
  }

  const c = base.color;
  return {
    ...base,
    solidBg:            `bg-${c}-600 dark:bg-${c}-500 text-white border-${c}-600 dark:border-${c}-500 shadow-md shadow-${c}-200/50 dark:shadow-none`,
    softBg:             `bg-${c}-50/50 dark:bg-${c}-950/20 text-${c}-700 dark:text-${c}-300 border-${c}-200/60 dark:border-${c}-900/30 hover:border-${c}-400 dark:hover:border-${c}-700 hover:bg-${c}-50/80 dark:hover:bg-${c}-950/30`,
    badgeActive:        `bg-white text-${c}-600 dark:bg-slate-900 dark:text-${c}-400 border-transparent`,
    badgeInactive:      `border-${c}-200 dark:border-${c}-800 text-${c}-600 dark:text-${c}-400 bg-transparent`,
    cardTextActive:     'text-white',
    cardTextInactive:   `text-${c}-700 dark:text-${c}-300`,
    cardSubtextActive:  `text-${c}-100/90`,
    cardSubtextInactive:'text-gray-400 dark:text-slate-500 font-bold',
    cardDividerActive:  `border-${c}-500/40`,
    cardDividerInactive:`border-${c}-100/60 dark:border-${c}-900/20`,
    iconActive:         'text-white',
    iconInactive:       `text-${c}-600 dark:text-${c}-400`,
    cardBg:             `bg-${c}-50/15 dark:bg-${c}-950/5`,
  };
}

// ─── Dynamic CSS generator for HEX-color jurusans ────────────────────────────

export function buildDynamicStyles(jurusanList: Jurusan[]): string {
  let styles = '';
  jurusanList?.forEach(j => {
    if (!j.warna?.startsWith('#')) return;
    const hex = j.warna;
    const id  = j.id;
    styles += `
      .major-theme-text-${id} { color: ${hex} !important; }
      .major-theme-bg-${id} { background-color: ${hex}18 !important; }
      .major-theme-border-${id} { border-color: ${hex} !important; }
      .major-theme-ring-${id} { --tw-ring-color: ${hex}24 !important; }
      .major-theme-bg-dec-${id} { background-color: ${hex}18 !important; }
      .major-theme-badge-${id} { background-color: ${hex} !important; color: #ffffff !important; border-color: transparent !important; }
      .major-theme-base-bg-${id} { background-color: ${hex}06 !important; }
      .major-theme-base-bg-${id}:hover { background-color: ${hex}12 !important; }
      .major-theme-base-border-${id} { border-color: ${hex}20 !important; }
      .major-theme-base-border-${id}:hover { border-color: ${hex}60 !important; }
      .major-theme-base-text-${id} { color: ${hex} !important; opacity: 0.8 !important; }
      .major-theme-base-bg-dec-${id} { background-color: ${hex}06 !important; }
      .major-theme-base-badge-${id} { border-color: ${hex}30 !important; color: ${hex} !important; background-color: transparent !important; }
      .major-theme-divider-${id} { border-color: ${hex}25 !important; }
      .major-theme-divider-base-${id} { border-color: ${hex}10 !important; }
      .major-tab-active-${id} { background-color: ${hex} !important; color: #ffffff !important; box-shadow: 0 4px 6px -1px ${hex}33, 0 2px 4px -1px ${hex}24 !important; }
      .major-tab-inactive-${id} { background-color: ${hex}10 !important; color: ${hex} !important; border: 1px solid ${hex}25 !important; }
      .major-tab-inactive-${id}:hover { background-color: ${hex}22 !important; }
      .major-card-solid-active-${id} { background-color: ${hex} !important; color: #ffffff !important; border-color: ${hex} !important; box-shadow: 0 10px 15px -3px ${hex}30, 0 4px 6px -4px ${hex}30 !important; }
      .major-card-soft-inactive-${id} { background-color: ${hex}08 !important; border-color: ${hex}20 !important; color: ${hex} !important; }
      .major-card-soft-inactive-${id}:hover { border-color: ${hex}50 !important; background-color: ${hex}12 !important; }
      .major-badge-active-${id} { background-color: #ffffff !important; color: ${hex} !important; border-color: transparent !important; }
      .major-badge-inactive-${id} { border-color: ${hex}30 !important; color: ${hex} !important; background-color: transparent !important; }
      .major-card-text-active-${id} { color: #ffffff !important; }
      .major-card-text-inactive-${id} { color: ${hex} !important; }
      .major-card-subtext-active-${id} { color: rgba(255, 255, 255, 0.7) !important; }
      .major-card-subtext-inactive-${id} { color: #94a3b8 !important; }
      .major-card-divider-active-${id} { border-color: rgba(255, 255, 255, 0.2) !important; }
      .major-card-divider-inactive-${id} { border-color: ${hex}20 !important; }
      .major-card-bg-${id} { background-color: ${hex}06 !important; }
    `;
  });
  return styles;
}
