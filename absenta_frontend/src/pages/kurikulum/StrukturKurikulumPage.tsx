import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Layers,
  Target,
  BarChart3,
  ChevronRight,
  BookOpen,
  Settings,
  Search,
  Printer,
  Loader2
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { kurikulumApi } from '../../api/kurikulum.api';
import { tahunPelajaranApi, jurusanApi } from '../../api/academic.api';
import { Skeleton } from '../../components/ui/Skeleton';
import { useNavigate } from 'react-router-dom';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { useJenjang } from '../../hooks/useJenjang';
import { cn } from '../../lib/utils';
import { z } from 'zod';
import { performStrukturPrint } from '../../utils/kurikulum/masterStrukturHelper';
import { useAuth } from '../../hooks/useAuth';
import { getTenantById } from '../../api/tenants.api';

const filterSchema = z.object({
  searchTerm: z.string().optional(),
  selectedKelompok: z.string().optional()
});

interface StrukturItem {
  id: string;
  tingkat: number;
  jp_per_minggu: number;
  kelompok?: string;
  Mapel?: {
    nama_mapel: string;
    kode_mapel: string;
  };
  [key: string]: unknown;
}

interface GradeStats {
  count: number;
  totalJp: number;
}

const SearchableSelect = lazy(() => import('../../components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect })));

const THEME_PALETTES = [
  // BLUE
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
    borderDividerBase: 'border-blue-100/30 dark:border-blue-950/20'
  },
  // CYAN
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
    borderDividerBase: 'border-cyan-100/30 dark:border-cyan-950/20'
  },
  // EMERALD
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
    borderDividerBase: 'border-emerald-100/30 dark:border-emerald-950/20'
  },
  // AMBER
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
    borderDividerBase: 'border-amber-100/30 dark:border-amber-950/20'
  },
  // ORANGE
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
    borderDividerBase: 'border-orange-100/30 dark:border-orange-950/20'
  },
  // ROSE
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
    borderDividerBase: 'border-rose-100/30 dark:border-rose-950/20'
  },
  // PINK
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
    borderDividerBase: 'border-pink-100/30 dark:border-pink-950/20'
  },
  // PURPLE
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
    borderDividerBase: 'border-purple-100/30 dark:border-indigo-950/20'
  },
  // TEAL
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
    borderDividerBase: 'border-teal-100/30 dark:border-teal-950/20'
  },
  // INDIGO
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
    borderDividerBase: 'border-indigo-100/30 dark:border-indigo-950/20'
  }
];

const resolveMajorTheme = (j: any) => {
  if (j.warna && j.warna.startsWith('#')) {
    const id = j.id;
    return {
      color: j.warna,
      activeTab: `major-tab-active-${id}`,
      inactiveTab: `major-tab-inactive-${id}`,
      border: `major-theme-border-${id}`,
      bg: `major-theme-bg-${id}`,
      ring: `major-theme-ring-${id}`,
      text: `major-theme-text-${id}`,
      bgDecorative: `major-theme-bg-dec-${id}`,
      badgeClass: `major-theme-badge-${id}`,
      baseBg: `major-theme-base-bg-${id}`,
      baseBorder: `major-theme-base-border-${id}`,
      baseText: `major-theme-base-text-${id}`,
      baseBgDecorative: `major-theme-base-bg-dec-${id}`,
      baseBadgeClass: `major-theme-base-badge-${id}`,
      borderDivider: `major-theme-divider-${id}`,
      borderDividerBase: `major-theme-divider-base-${id}`,
      
      // Dynamic Card classes for custom HEX
      solidBg: `major-card-solid-active-${id}`,
      softBg: `major-card-soft-inactive-${id}`,
      badgeActive: `major-badge-active-${id}`,
      badgeInactive: `major-badge-inactive-${id}`,
      cardTextActive: `major-card-text-active-${id}`,
      cardTextInactive: `major-card-text-inactive-${id}`,
      cardSubtextActive: `major-card-subtext-active-${id}`,
      cardSubtextInactive: `major-card-subtext-inactive-${id}`,
      cardDividerActive: `major-card-divider-active-${id}`,
      cardDividerInactive: `major-card-divider-inactive-${id}`,
      iconActive: `major-card-text-active-${id}`,
      iconInactive: `major-card-text-inactive-${id}`,
      cardBg: `major-card-bg-${id}`
    };
  }
  
  let baseTheme = THEME_PALETTES[THEME_PALETTES.length - 1]; // Fallback to Indigo
  if (j.warna) {
    const found = THEME_PALETTES.find(p => p.color === j.warna.toLowerCase());
    if (found) baseTheme = found;
  } else {
    baseTheme = getThemeForMajor(j.kode || '', j.id);
  }

  const c = baseTheme.color;
  return {
    ...baseTheme,
    solidBg: `bg-${c}-600 dark:bg-${c}-500 text-white border-${c}-600 dark:border-${c}-500 shadow-md shadow-${c}-200/50 dark:shadow-none`,
    softBg: `bg-${c}-50/50 dark:bg-${c}-950/20 text-${c}-700 dark:text-${c}-300 border-${c}-200/60 dark:border-${c}-900/30 hover:border-${c}-400 dark:hover:border-${c}-700 hover:bg-${c}-50/80 dark:hover:bg-${c}-950/30`,
    badgeActive: `bg-white text-${c}-600 dark:bg-slate-900 dark:text-${c}-400 border-transparent`,
    badgeInactive: `border-${c}-200 dark:border-${c}-800 text-${c}-600 dark:text-${c}-400 bg-transparent`,
    cardTextActive: `text-white`,
    cardTextInactive: `text-${c}-700 dark:text-${c}-300`,
    cardSubtextActive: `text-${c}-100/90`,
    cardSubtextInactive: `text-gray-400 dark:text-slate-500 font-bold`,
    cardDividerActive: `border-${c}-500/40`,
    cardDividerInactive: `border-${c}-100/60 dark:border-${c}-900/20`,
    iconActive: `text-white`,
    iconInactive: `text-${c}-600 dark:text-${c}-400`,
    cardBg: `bg-${c}-50/15 dark:bg-${c}-950/5`
  };
};

const getThemeForMajor = (code: string, id: string) => {
  const key = id || code || '';
  if (!key) return THEME_PALETTES[THEME_PALETTES.length - 1];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % THEME_PALETTES.length;
  return THEME_PALETTES[index];
};

const StrukturKurikulumPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tingkatList, kelompokOptions, jenjang } = useJenjang();

  const [selectedTingkat, setSelectedTingkat] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKelompok, setSelectedKelompok] = useState<string>('ALL');
  const [selectedJurusanId, setSelectedJurusanId] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);

  const isSmkOrMak = useMemo(() => {
    const j = (jenjang || '').toUpperCase();
    return j === 'SMK' || j === 'MAK';
  }, [jenjang]);

  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => tahunPelajaranApi.getAll()
  });

  const { data: jurusans } = useQuery({
    queryKey: ['academic-jurusans'],
    queryFn: () => jurusanApi.getAll(),
    enabled: isSmkOrMak
  });

  const { data: tenantRes } = useQuery({
    queryKey: ['tenant-profile', user?.tenant_id],
    queryFn: () => getTenantById(user?.tenant_id || ''),
    enabled: !!user?.tenant_id
  });
  const tenantInfo = tenantRes?.data;

  // Set default selectedJurusanId
  React.useEffect(() => {
    if (isSmkOrMak && jurusans?.data && jurusans.data.length > 0 && !selectedJurusanId) {
      setSelectedJurusanId(jurusans.data[0].id);
    }
  }, [isSmkOrMak, jurusans, selectedJurusanId]);

  const activeYear = useMemo(() => (years?.data ?? []).find(y => y.is_active), [years]);

  const { data: mapping, isLoading } = useQuery({
    queryKey: ['kurikulum-struktur-summary', activeYear?.id, selectedJurusanId],
    queryFn: () => kurikulumApi.getStruktur({ 
      tahun_pelajaran_id: activeYear?.id,
      jurusan_id: isSmkOrMak ? (selectedJurusanId || undefined) : undefined
    }),
    enabled: !!activeYear
  });

  React.useEffect(() => {
    if (tingkatList && tingkatList.length > 0 && selectedTingkat === null) {
      setSelectedTingkat(tingkatList[0]);
    }
  }, [tingkatList, selectedTingkat]);

  const statsByGrade = useMemo<Record<number, GradeStats>>(() => {
    if (!mapping?.data) return {};
    const stats: Record<number, GradeStats> = {};

    ((mapping.data ?? []) as StrukturItem[]).forEach((item) => {
      if (!stats[item.tingkat]) stats[item.tingkat] = { count: 0, totalJp: 0 };
      stats[item.tingkat].count++;
      stats[item.tingkat].totalJp += item.jp_per_minggu ?? 0;
    });

    return stats;
  }, [mapping]);

  const activeCardTheme = useMemo(() => {
    if (!isSmkOrMak || !jurusans?.data) {
      return THEME_PALETTES[THEME_PALETTES.length - 1]; // Fallback to Indigo
    }
    const j = jurusans.data.find(item => item.id === selectedJurusanId);
    if (!j) return THEME_PALETTES[THEME_PALETTES.length - 1];
    return resolveMajorTheme(j);
  }, [isSmkOrMak, jurusans, selectedJurusanId]);

  const dynamicStyles = useMemo(() => {
    if (!jurusans?.data) return '';
    let styles = '';
    jurusans.data.forEach(j => {
      if (j.warna && j.warna.startsWith('#')) {
        const hex = j.warna;
        const id = j.id;
        styles += `
          /* Major ${j.nama} (ID: ${id}) Custom Color Theme */
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
          
          /* Tab Button Styles */
          .major-tab-active-${id} { background-color: ${hex} !important; color: #ffffff !important; box-shadow: 0 4px 6px -1px ${hex}33, 0 2px 4px -1px ${hex}24 !important; }
          .major-tab-inactive-${id} { background-color: ${hex}10 !important; color: ${hex} !important; border: 1px solid ${hex}25 !important; }
          .major-tab-inactive-${id}:hover { background-color: ${hex}22 !important; }

          /* Card Styles */
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
      }
    });
    
    return styles;
  }, [jurusans]);

  const filteredData = useMemo(() => {
    if (!mapping?.data || selectedTingkat === null) return [];
    
    return ((mapping.data ?? []) as StrukturItem[]).filter(item => {
      if (item.tingkat !== selectedTingkat) return false;
      
      const matchesSearch = !searchTerm || 
        item.Mapel?.nama_mapel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.Mapel?.kode_mapel?.toLowerCase().includes(searchTerm.toLowerCase());
        
      let itemKelompok = item.kelompok ?? 'MATA PELAJARAN UMUM';
      if (itemKelompok === 'NASIONAL' || itemKelompok === 'UMUM') itemKelompok = 'MATA PELAJARAN UMUM';
      if (itemKelompok === 'KEJURUAN') itemKelompok = 'MATA PELAJARAN KEJURUAN';
      if (itemKelompok === 'PILIHAN') itemKelompok = 'MATA PELAJARAN PILIHAN';
      if (itemKelompok === 'LOKAL' || itemKelompok === 'MUATAN_LOKAL') itemKelompok = 'MUATAN LOKAL';
      
      const matchesKelompok = selectedKelompok === 'ALL' || itemKelompok === selectedKelompok;
      
      return matchesSearch && matchesKelompok;
    });
  }, [mapping, selectedTingkat, searchTerm, selectedKelompok]);

  const selectedGradeStats = useMemo(() => {
    const defaultStats = { totalJp: 0, mapelCount: 0, byKelompok: {} as Record<string, { jp: number, count: number }> };
    if (!mapping?.data || selectedTingkat === null) return defaultStats;
    
    const gradeData = ((mapping.data ?? []) as StrukturItem[]).filter(item => item.tingkat === selectedTingkat);
    
    return gradeData.reduce((acc, curr) => {
      acc.totalJp += curr.jp_per_minggu ?? 0;
      acc.mapelCount++;
      
      let kel = curr.kelompok ?? 'MATA PELAJARAN UMUM';
      if (kel === 'NASIONAL' || kel === 'UMUM') kel = 'MATA PELAJARAN UMUM';
      if (kel === 'KEJURUAN') kel = 'MATA PELAJARAN KEJURUAN';
      if (kel === 'PILIHAN') kel = 'MATA PELAJARAN PILIHAN';
      if (kel === 'LOKAL' || kel === 'MUATAN_LOKAL') kel = 'MUATAN LOKAL';
      
      if (!acc.byKelompok[kel]) {
        acc.byKelompok[kel] = { jp: 0, count: 0 };
      }
      acc.byKelompok[kel].jp += curr.jp_per_minggu ?? 0;
      acc.byKelompok[kel].count++;
      
      return acc;
    }, { totalJp: 0, mapelCount: 0, byKelompok: {} as Record<string, { jp: number, count: number }> });
  }, [mapping, selectedTingkat]);

  React.useEffect(() => {
    const validation = filterSchema.safeParse({ searchTerm, selectedKelompok });
    if (!validation.success) {
      console.warn('Filter tidak valid:', validation.error.message);
    }
  }, [searchTerm, selectedKelompok]);

  const handleManagePlotting = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedTingkat !== null) params.set('tingkat', String(selectedTingkat));
    if (isSmkOrMak && selectedJurusanId) params.set('jurusan_id', selectedJurusanId);
    navigate(`/kurikulum/plotting?${params.toString()}`);
  }, [navigate, selectedTingkat, isSmkOrMak, selectedJurusanId]);

  const handleCetak = useCallback(async () => {
    if (!mapping?.data) return;
    const selectedJurusan = isSmkOrMak
      ? jurusans?.data?.find((j: any) => j.id === selectedJurusanId)
      : undefined;
    await performStrukturPrint({
      tenantInfo,
      selectedTingkat: selectedTingkat ?? 10,
      selectedTahunNama: activeYear?.tahun || '',
      selectedJurusan,
      mappingData: mapping.data as any,
      setIsPrinting
    });
  }, [mapping, tenantInfo, selectedTingkat, activeYear, jurusans, selectedJurusanId, isSmkOrMak]);

  const selectOptions = useMemo(() => [
    { label: 'SEMUA KELOMPOK', value: 'ALL' },
    ...(kelompokOptions ?? [])?.map(opt => ({
      label: opt.label.toUpperCase(),
      value: opt.value
    }))
  ], [kelompokOptions]);

  const breadcrumbs = useMemo(() => [
    { label: 'Akademik', path: '/academic' },
    { label: 'Kurikulum', path: '/kurikulum' },
    { label: 'Struktur Kurikulum' }
  ], []);

  return (
    <AcademicPageLayout
      title="Struktur Kurikulum"
      description="Overview pembagian beban belajar dan kurikulum operasional."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="strukturkurikulumpage"
      instruction={{
        title: 'Panduan Struktur Kurikulum',
        description: 'Halaman ini menampilkan alokasi jam pelajaran (JP) per tingkat kelas berdasarkan tahun pelajaran aktif.',
        items: [
          { text: 'Pilih tingkat kelas pada kartu di atas untuk memfilter daftar mata pelajaran di bawah.' },
          { text: 'Pastikan total JP per minggu di setiap tingkat telah sesuai dengan standar Kurikulum Merdeka.' },
          { text: 'Klik "KELOLA PLOTTING JP" untuk menambah atau mengubah pembagian jam pelajaran.' }
        ]
      }}
    >
      {dynamicStyles && <style>{dynamicStyles}</style>}
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3.5">
            <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md", isSmkOrMak ? activeCardTheme.text : "text-indigo-500", isSmkOrMak ? activeCardTheme.bg : "bg-indigo-50 dark:bg-indigo-950/40")}>
              Tahun Pelajaran: {activeYear ? activeYear.tahun : 'Memuat...'}
            </span>

            {isSmkOrMak && jurusans?.data && jurusans.data.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                {jurusans.data.map((j) => {
                  const isSelected = selectedJurusanId === j.id;
                  const label = j.singkatan || j.kode || j.nama;
                  const theme = resolveMajorTheme(j);

                  return (
                    <button
                      key={j.id}
                      onClick={() => setSelectedJurusanId(j.id)}
                      className={cn(
                        "px-3 py-1.5 text-[11px] font-black rounded-xl transition-all select-none border border-transparent cursor-pointer",
                        isSelected 
                          ? theme.activeTab
                          : theme.inactiveTab
                      )}
                      title={j.nama}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <Button
            onClick={handleManagePlotting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none font-black self-end sm:self-auto"
          >
            <Settings className="w-4 h-4 mr-2" />
            KELOLA PLOTTING JP
          </Button>
        </div>

        {!activeYear && !isLoading && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-2xl border border-amber-200 dark:border-amber-800 text-sm font-bold flex items-center">
            <span className="mr-2">⚠️</span>
            Tahun Pelajaran Aktif tidak ditemukan. Harap aktifkan Tahun Pelajaran di menu Akademik.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tingkatList?.map((grade) => {
            const s = statsByGrade[grade] ?? { count: 0, totalJp: 0 };
            const isActive = selectedTingkat === grade;
            return (
              <Card 
                key={grade} 
                onClick={() => setSelectedTingkat(grade)}
                className={cn(
                  "p-6 border transition-all cursor-pointer relative overflow-hidden group select-none rounded-2xl",
                  isActive 
                    ? activeCardTheme.solidBg
                    : activeCardTheme.softBg
                )}
              >
                <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 rounded-full group-hover:scale-110 transition-transform", isActive ? "bg-white/10" : activeCardTheme.bgDecorative)}></div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant={isActive ? "default" : "outline"} className={cn("text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg border", isActive ? activeCardTheme.badgeActive : activeCardTheme.badgeInactive)}>
                      TINGKAT {grade}
                    </Badge>
                    <Target className={cn("w-5 h-5 transition-colors", isActive ? activeCardTheme.iconActive : activeCardTheme.iconInactive)} />
                  </div>

                  <div>
                    {isLoading ? (
                      <Skeleton className="h-10 w-20" />
                    ) : (
                      <p className={cn("text-4xl font-black leading-none", isActive ? activeCardTheme.cardTextActive : activeCardTheme.cardTextInactive)}>{s.totalJp}</p>
                    )}
                    <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-2", isActive ? activeCardTheme.cardSubtextActive : activeCardTheme.cardSubtextInactive)}>Total Jam / Minggu</p>
                  </div>

                  <div className={cn(
                    "flex items-center justify-between pt-4 border-t transition-colors",
                    isActive ? activeCardTheme.cardDividerActive : activeCardTheme.cardDividerInactive
                  )}>
                    <div className={cn("flex items-center text-[10px] font-bold uppercase tracking-wider", isActive ? activeCardTheme.cardTextActive : activeCardTheme.cardTextInactive)}>
                      <BookOpen size={12} className="mr-1.5" />
                      {s.count} Mata Pelajaran
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {selectedTingkat !== null && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-8 flex">
              <Card id="print-area-kurikulum" className={cn("p-6 rounded-2xl border shadow-sm flex flex-col justify-between w-full transition-colors duration-500", activeCardTheme.cardBg, activeCardTheme.borderDividerBase)}>
                <div className="space-y-4">
                  <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b", activeCardTheme.borderDividerBase)}>
                    <div>
                      <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center text-sm">
                        <BookOpen size={16} className="mr-2 text-indigo-600" />
                        Daftar Mapel - Tingkat {selectedTingkat}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                        Menampilkan {filteredData?.length} dari {selectedGradeStats.mapelCount} mata pelajaran
                      </p>
                    </div>

                    <div className="flex items-center gap-3 no-print">
                      <Button
                        type="button"
                        onClick={handleCetak}
                        disabled={isPrinting || !mapping?.data}
                        className="h-9 px-3.5 text-[10px] font-black rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPrinting
                          ? <><Loader2 size={13} className="animate-spin text-slate-400" /> Menyiapkan...</>
                          : <><Printer size={13} className="text-slate-500" /> Cetak</>
                        }
                      </Button>

                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          placeholder="Cari mapel..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          aria-label="Cari mata pelajaran"
                          className="w-48 h-9 pl-9 pr-3 text-xs rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                        />
                      </div>

                      <Suspense fallback={<div className="h-9 w-40 bg-slate-50 dark:bg-slate-900 rounded-2xl animate-pulse" />}>
                        <SearchableSelect
                          id="kelompok-select"
                          value={selectedKelompok}
                          onValueChange={setSelectedKelompok}
                          options={selectOptions}
                          placeholder="Semua Kelompok"
                        />
                      </Suspense>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-gray-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Kelompok</th>
                          <th className="px-4 py-3">Mata Pelajaran</th>
                          <th className="px-4 py-3 text-center">Beban Belajar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                        {isLoading ? (
                          [1, 2, 3, 4]?.map(i => (
                            <tr key={i}>
                              <td className="px-4 py-3" colSpan={3}>
                                <Skeleton className="h-10 w-full rounded-2xl" />
                              </td>
                            </tr>
                          ))
                        ) : filteredData?.length === 0 ? (
                          <tr>
                            <td className="px-4 py-16 text-center text-xs font-bold text-gray-400 italic" colSpan={3}>
                              Tidak ada mata pelajaran yang cocok dengan filter.
                            </td>
                          </tr>
                        ) : (
                          filteredData?.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                              <td className="px-4 py-3">
                                <Badge className={cn(
                                  "font-bold border-none px-2 py-0.5 rounded text-[9px] uppercase",
                                  item.kelompok?.includes('KEJURUAN') ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" :
                                  item.kelompok?.includes('PILIHAN') ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400" :
                                  item.kelompok?.includes('LOKAL') ? "bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400" :
                                  "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400"
                                )}>
                                  {item.kelompok?.includes('KEJURUAN') ? 'MAPEL KEJURUAN' :
                                   item.kelompok?.includes('PILIHAN') ? 'MAPEL PILIHAN' :
                                   item.kelompok?.includes('LOKAL') ? 'MUATAN LOKAL' :
                                   'MAPEL UMUM'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.Mapel?.nama_mapel}</p>
                                  <p className="text-[9px] font-mono text-gray-400 mt-0.5">{item.Mapel?.kode_mapel}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{item.jp_per_minggu}</span>
                                <span className="text-[9px] font-bold text-gray-400 ml-1">JP / Minggu</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-900 text-right">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">
                    * JP: Jam Pelajaran (1 JP bernilai 45 menit)
                  </span>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6">
              <Card className={cn("p-6 rounded-2xl border space-y-6 shadow-sm transition-colors duration-500", activeCardTheme.cardBg, activeCardTheme.borderDividerBase)}>
                <div className="space-y-1">
                  <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-xs flex items-center">
                    <BarChart3 size={15} className="mr-2 text-indigo-600" />
                    Metrik Beban Tingkat {selectedTingkat}
                  </h3>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Analisis alokasi jam</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-50 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{selectedGradeStats.totalJp} JP</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total Beban Kelas</p>
                  </div>
                  <div className={cn(
                    "text-[10px] font-black uppercase px-2.5 py-1 rounded-lg",
                    selectedGradeStats.totalJp >= 40 && selectedGradeStats.totalJp <= 48 
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20" 
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/20"
                  )}>
                    {selectedGradeStats.totalJp >= 40 && selectedGradeStats.totalJp <= 48 ? "IDEAL" : "KHUSUS"}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kontribusi Kelompok</p>
                  {kelompokOptions?.map(opt => {
                    const kel = opt.value;
                    const label = opt.label;
                    const dataKel = selectedGradeStats.byKelompok[kel] ?? { jp: 0, count: 0 };
                    const percentage = selectedGradeStats.totalJp > 0 
                      ? Math.round((dataKel.jp / selectedGradeStats.totalJp) * 100) 
                      : 0;
                    return (
                      <div key={kel} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-gray-500 uppercase">{label}</span>
                          <span className="text-slate-800 dark:text-white">{dataKel.jp} JP ({percentage}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              kel.includes('KEJURUAN') || kel.includes('PRODUCTIVE') ? "bg-emerald-500" :
                              kel.includes('PILIHAN') || kel.includes('ELECTIVE') || kel.includes('PEMINATAN') ? "bg-amber-500" :
                              kel.includes('LOKAL') || kel.includes('LOCAL') ? "bg-sky-500" :
                              "bg-indigo-500"
                            )}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-6 rounded-2xl border-none shadow-sm bg-slate-900 dark:bg-slate-950 text-white relative overflow-hidden flex-1 flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10 space-y-4">
                  <div className="p-3 bg-white/10 rounded-2xl w-fit">
                    <Layers size={20} className="text-indigo-400" />
                  </div>
                  <h4 className="text-base font-black uppercase tracking-tight">Otomasi Slot Jadwal</h4>
                  <p className="text-xs text-white/60 leading-relaxed font-medium">
                    Apabila struktur kurikulum (JP) tingkat ini telah terdefinisi secara lengkap, slot waktu mingguan untuk guru pengampu akan terbuat secara otomatis pada modul Jadwal Pelajaran.
                  </p>
                </div>
                <Button
                  onClick={handleManagePlotting}
                  className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl border-none h-11 text-xs"
                >
                  PLOT STRUKTUR SEKARANG
                  <ChevronRight size={16} className="ml-1.5" />
                </Button>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AcademicPageLayout>
  );
};

export default StrukturKurikulumPage;
