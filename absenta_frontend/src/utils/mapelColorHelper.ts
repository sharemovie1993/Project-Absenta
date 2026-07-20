export interface MapelColorStyle {
  bg: string;
  text: string;
  border: string;
  badge: string;
  dotHex: string;
}

export function getMapelColor(mapelName: string = '', customColor?: string | null): MapelColorStyle {
  if (customColor) {
    return {
      bg: 'bg-slate-50 dark:bg-slate-900',
      text: 'text-slate-800 dark:text-slate-200',
      border: 'border-slate-200 dark:border-slate-700',
      badge: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
      dotHex: customColor,
    };
  }

  const nameLower = mapelName.toLowerCase();

  // 🟦 Matematika / MTK -> Blue
  if (nameLower.includes('matematika') || nameLower.includes('mtk')) {
    return {
      bg: 'bg-blue-50/80 dark:bg-blue-950/40',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      badge: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      dotHex: '#3B82F6',
    };
  }

  // 🟥 Bahasa Indonesia -> Rose / Red
  if (nameLower.includes('indonesia')) {
    return {
      bg: 'bg-rose-50/80 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800',
      badge: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      dotHex: '#F43F5E',
    };
  }

  // 🟪 Bahasa Inggris -> Purple / Violet
  if (nameLower.includes('inggris')) {
    return {
      bg: 'bg-purple-50/80 dark:bg-purple-950/40',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
      badge: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      dotHex: '#A855F7',
    };
  }

  // 🟩 PAI / Agama -> Emerald / Green
  if (nameLower.includes('agama') || nameLower.includes('pai') || nameLower.includes('islam') || nameLower.includes('kristen')) {
    return {
      bg: 'bg-emerald-50/80 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      badge: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      dotHex: '#10B981',
    };
  }

  // 🟧 PJOK / Olahraga -> Amber / Orange
  if (nameLower.includes('pjok') || nameLower.includes('olahraga') || nameLower.includes('penjas')) {
    return {
      bg: 'bg-amber-50/80 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      badge: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      dotHex: '#F59E0B',
    };
  }

  // 🩵 Fisika / Kimia / Biologi / IPA -> Cyan
  if (nameLower.includes('fisika') || nameLower.includes('kimia') || nameLower.includes('biologi') || nameLower.includes('ipa')) {
    return {
      bg: 'bg-cyan-50/80 dark:bg-cyan-950/40',
      text: 'text-cyan-700 dark:text-cyan-300',
      border: 'border-cyan-200 dark:border-cyan-800',
      badge: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      dotHex: '#06B6D4',
    };
  }

  // 🔴 Sejarah / PPKn / Pancasila -> Red
  if (nameLower.includes('sejarah') || nameLower.includes('ppkn') || nameLower.includes('pancasila') || nameLower.includes('pkn')) {
    return {
      bg: 'bg-red-50/80 dark:bg-red-950/40',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      badge: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      dotHex: '#EF4444',
    };
  }

  // 🟫 Kejuruan / Produktif (RPL, TKJ, AKL, TKR, DKV, Multimedia) -> Indigo
  if (
    nameLower.includes('kejuruan') || 
    nameLower.includes('produktif') || 
    nameLower.includes('rpl') || 
    nameLower.includes('tkj') || 
    nameLower.includes('akl') || 
    nameLower.includes('pemrograman') ||
    nameLower.includes('jaringan') ||
    nameLower.includes('akuntansi') ||
    nameLower.includes('multimedia') ||
    nameLower.includes('dkv')
  ) {
    return {
      bg: 'bg-indigo-50/80 dark:bg-indigo-950/40',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800',
      badge: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      dotHex: '#6366F1',
    };
  }

  // 🩷 Seni Budaya / SBK / Prakarya / PKWU -> Pink / Fuchsia
  if (nameLower.includes('seni') || nameLower.includes('sbk') || nameLower.includes('prakarya') || nameLower.includes('pkwu')) {
    return {
      bg: 'bg-pink-50/80 dark:bg-pink-950/40',
      text: 'text-pink-700 dark:text-pink-300',
      border: 'border-pink-200 dark:border-pink-800',
      badge: 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
      dotHex: '#EC4899',
    };
  }

  // 🍃 BK / Bimbingan Konseling -> Teal
  if (nameLower.includes('bk') || nameLower.includes('bimbingan')) {
    return {
      bg: 'bg-teal-50/80 dark:bg-teal-950/40',
      text: 'text-teal-700 dark:text-teal-300',
      border: 'border-teal-200 dark:border-teal-800',
      badge: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
      dotHex: '#14B8A6',
    };
  }

  let hash = 0;
  for (let i = 0; i < mapelName.length; i++) {
    hash = mapelName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;

  return {
    bg: 'bg-slate-50/90 dark:bg-slate-800/80',
    text: 'text-slate-800 dark:text-slate-200',
    border: 'border-slate-200 dark:border-slate-700',
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
    dotHex: `hsl(${hue}, 65%, 50%)`,
  };
}

/**
 * Smart Subject Abbreviation Generator ala aSC TimeTables
 * Returns concise 3-8 character abbreviation for crisp display on timetable slot cards
 */
export function getMapelAbbreviation(mapelName: string = '', kodeMapel?: string | null): string {
  if (kodeMapel && kodeMapel.trim().length > 0 && kodeMapel.trim().length <= 8) {
    return kodeMapel.trim().toUpperCase();
  }

  if (!mapelName || mapelName.trim().length === 0) {
    return 'KBM';
  }

  const nameLower = mapelName.toLowerCase().trim();

  // Standard Indonesian School Subjects
  if (nameLower.includes('matematika') || nameLower.includes('mtk')) return 'MTK';
  if (nameLower.includes('indonesia')) return 'B. INDO';
  if (nameLower.includes('inggris')) return 'B. ING';
  if (nameLower.includes('agama') || nameLower.includes('pai')) return 'PAI';
  if (nameLower.includes('pjok') || nameLower.includes('olahraga') || nameLower.includes('penjas')) return 'PJOK';
  if (nameLower.includes('pancasila') || nameLower.includes('ppkn') || nameLower.includes('pkn')) return 'PPKn';
  if (nameLower.includes('sejarah')) return 'SEJ';
  if (nameLower.includes('fisika')) return 'FIS';
  if (nameLower.includes('kimia')) return 'KIM';
  if (nameLower.includes('biologi')) return 'BIO';
  if (nameLower.includes('geografi')) return 'GEO';
  if (nameLower.includes('ekonomi')) return 'EKO';
  if (nameLower.includes('sosiologi')) return 'SOS';
  if (nameLower.includes('seni')) return 'SENI';
  if (nameLower.includes('prakarya') || nameLower.includes('pkwu')) return 'PKWU';
  if (nameLower.includes('informatika') || nameLower.includes('simdig') || nameLower.includes('tik')) return 'INF';
  if (nameLower.includes('bimbingan') || nameLower.includes('konseling') || nameLower.includes('bk')) return 'BK';

  // Multi-word Subject Acronym Rule (e.g. "Pemrograman Web Dan Perangkat Bergerak" -> "PWPB")
  const words = mapelName.trim().split(/\s+/);
  if (words.length >= 2) {
    const abbr = words
      .filter(w => !['dan', 'atau', 'pada', 'untuk', 'di', 'ke', 'dari'].includes(w.toLowerCase()))
      .map(w => w[0]?.toUpperCase() || '')
      .join('');
    if (abbr.length >= 2 && abbr.length <= 6) {
      return abbr;
    }
  }

  // Fallback: If single long word (e.g. "PRODUKTIF" -> "PROD.")
  if (mapelName.length > 8) {
    return mapelName.substring(0, 7).toUpperCase() + '.';
  }

  return mapelName.toUpperCase();
}
