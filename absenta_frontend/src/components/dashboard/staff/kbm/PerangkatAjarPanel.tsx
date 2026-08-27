import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Book, BookOpen, Plus, ExternalLink, FileText, Download,
  Search, CheckCircle2, Sparkles, Folder, Presentation,
  Globe, UserCheck, Clock, Layers, ChevronRight, ChevronDown, ChevronUp, AlertCircle,
  Zap, Check, ArrowRight, BookCheck, ShieldCheck
} from 'lucide-react';
import { kurikulumApi } from '../../../../api/kurikulum.api';
import {
  getBahanAjarPresets,
  importBahanAjarPreset,
  BahanAjarPresetData
} from '../../../../api/bahan-ajar.api';
import { Button, Badge } from '../../../ui';
import { cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { BahanAjarReaderModal } from '../../../kurikulum/bahan-ajar/BahanAjarReaderModal';
import { ModulAjarStudioModal } from '../../../kurikulum/bahan-ajar/ModulAjarStudioModal';

// ── ICON BUKU BERDIRI (STANDING BOOK 3D) ──
const StandingBookIcon: React.FC<{
  color?: string;
  spineColor?: string;
  isActive?: boolean;
  className?: string;
}> = ({
  color = '#2563eb',
  spineColor = '#1d4ed8',
  isActive = false,
  className = 'w-5 h-6'
}) => (
  <svg viewBox="0 0 48 54" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Soft Shadow */}
    <ellipse cx="24" cy="51" rx="16" ry="2.5" fill="black" fillOpacity={isActive ? "0.2" : "0.08"} />
    
    {/* Spine (Left side) */}
    <path d="M10 8C10 6.89543 10.8954 6 12 6H17V48H12C10.8954 48 10 47.1046 10 46V8Z" fill={spineColor} />
    <path d="M12 6H17V48H12C10.8954 48 10 47.1046 10 46V8C10 6.89543 10.8954 6 12 6Z" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
    
    {/* Spine ribs */}
    <line x1="10" y1="13" x2="17" y2="13" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
    <line x1="10" y1="17" x2="17" y2="17" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
    <line x1="10" y1="37" x2="17" y2="37" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
    <line x1="10" y1="41" x2="17" y2="41" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
    
    {/* Front Cover */}
    <path d="M17 6H35C36.1046 6 37 6.89543 37 8V46C37 47.1046 36.1046 48 35 48H17V6Z" fill={color} />
    
    {/* Top Pages Isometric */}
    <path d="M17 6L25 2H43L35 6H17Z" fill="#F8FAFC" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
    <line x1="19" y1="5.2" x2="26" y2="2.7" stroke="#CBD5E1" strokeWidth="0.7" />
    <line x1="24" y1="5.2" x2="32" y2="2.7" stroke="#CBD5E1" strokeWidth="0.7" />
    <line x1="29" y1="5.2" x2="37" y2="2.7" stroke="#CBD5E1" strokeWidth="0.7" />
    
    {/* Side Edge Pages */}
    <path d="M37 8L43 2V42L37 48V8Z" fill="#F1F5F9" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
    <line x1="39" y1="7" x2="39" y2="45" stroke="#E2E8F0" strokeWidth="0.8" />
    <line x1="41" y1="5" x2="41" y2="43" stroke="#CBD5E1" strokeWidth="0.8" />

    {/* Gold Bookmark Ribbon if Active */}
    {isActive ? (
      <path d="M24 6V20L28 17L32 20V6H24Z" fill="#F59E0B" />
    ) : null}

    {/* Title frame label on front cover */}
    <rect x="20" y="14" width="13" height="18" rx="1.5" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.7" />
  </svg>
);

const BOOK_PALETTES = [
  { main: '#2563eb', spine: '#1d4ed8', activeBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300' },
  { main: '#059669', spine: '#047857', activeBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300' },
  { main: '#7c3aed', spine: '#6d28d9', activeBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300' },
  { main: '#d97706', spine: '#b45309', activeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300' },
  { main: '#e11d48', spine: '#be123c', activeBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300' },
  { main: '#0891b2', spine: '#0e7490', activeBg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 text-cyan-700 dark:text-cyan-300' },
];

interface PerangkatAjarPanelProps {
  guruId?: string;
}

export const PerangkatAjarPanel: React.FC<PerangkatAjarPanelProps> = ({ guruId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMapelFilter, setSelectedMapelFilter] = useState<string>('ALL');

  // Reader & Studio Modals State
  const [readerPerangkatId, setReaderPerangkatId] = useState<string>('');
  const [isReaderOpen, setIsReaderOpen] = useState<boolean>(false);
  const [readerContext, setReaderContext] = useState<{
    mapelNama?: string;
    fase?: string;
    tingkat?: number;
  }>({});

  const [studioPerangkat, setStudioPerangkat] = useState<{
    id: string;
    judul: string;
    mapelNama?: string;
    fase?: string;
    tingkat?: number;
  } | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);

  // Helper to extract module/chapter number from title
  const extractModulNumber = (title: string): number => {
    const m = title.match(/modul\s*(\d+)|bab\s*(\d+)/i);
    if (m) {
      return parseInt(m[1] || m[2], 10);
    }
    return 999;
  };

  // 0. Fetch Teacher's Assigned Subjects
  const { data: teacherAssignedRes } = useQuery({
    queryKey: ['guru-assigned-mapels-panel', guruId],
    queryFn: () => (guruId ? kurikulumApi.getGuruMapel(guruId).catch(() => null) : null),
    enabled: !!guruId
  });

  const assignedMapelList = useMemo(() => {
    const raw = teacherAssignedRes?.data || [];
    return raw.map((item: any) => ({
      id: item.mapel_id || item.Mapel?.id || item.id,
      name: item.Mapel?.nama_mapel || item.nama_mapel || ''
    })).filter((m: any) => Boolean(m.name));
  }, [teacherAssignedRes]);

  // 1. Fetch Real Teacher's Perangkat Ajar
  const { data: myPerangkatRes, isLoading: isLoadingMyPerangkat } = useQuery({
    queryKey: ['myPerangkatAjarKbm', guruId],
    queryFn: () => kurikulumApi.getPerangkatAjar(guruId ? { guru_id: guruId } : {}),
    staleTime: 1000 * 60 * 5
  });

  const myPerangkatList = myPerangkatRes?.data || [];

  // 2. Fetch Global Platform Presets (National Curriculum Deep Learning Library)
  const { data: globalPresets = [], isLoading: isLoadingPresets } = useQuery({
    queryKey: ['globalBahanAjarPresets'],
    queryFn: () => getBahanAjarPresets(),
    staleTime: 1000 * 60 * 10
  });

  // 3. 1-Click Adopt Preset Mutation
  const adoptMutation = useMutation({
    mutationFn: async (preset: BahanAjarPresetData) => {
      // Find matching mapel_id from teacher's existing items or first available mapel
      const matchedPerangkat = myPerangkatList.find((p: any) =>
        p.Mapel?.nama_mapel?.toLowerCase().includes(preset.nama_mapel_ref.toLowerCase()) ||
        preset.nama_mapel_ref.toLowerCase().includes((p.Mapel?.nama_mapel || '').toLowerCase())
      );

      const matchedAssigned = assignedMapelList.find((m: any) =>
        m.name.toLowerCase().includes(preset.nama_mapel_ref.toLowerCase()) ||
        preset.nama_mapel_ref.toLowerCase().includes(m.name.toLowerCase())
      );

      const mapelId = matchedPerangkat?.Mapel?.id || matchedAssigned?.id || myPerangkatList[0]?.Mapel?.id || 'mapel-default';

      return importBahanAjarPreset(preset.id, {
        guru_id: guruId,
        mapel_id: mapelId
      });
    },
    onSuccess: (res, preset) => {
      queryClient.invalidateQueries({ queryKey: ['myPerangkatAjarKbm'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar'] });
      toast.success(`🚀 Berhasil mengadopsi '${preset.judul_modul}'! Siap digunakan di kelas & proyektor.`, {
        icon: '✨',
        duration: 4000
      });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengadopsi modul');
    }
  });

  // Distinct subjects detected: Prioritize teacher's real assigned subjects!
  const distinctSubjects = useMemo(() => {
    const subjectsMap = new Map<string, { id: string; name: string; isAssigned: boolean }>();

    // 1. Prioritaskan Mapel yang diampu guru di jadwal
    if (assignedMapelList.length > 0) {
      assignedMapelList.forEach((m: any) => {
        subjectsMap.set(m.name, {
          id: m.id,
          name: m.name,
          isAssigned: true
        });
      });
    }

    // 2. Mapel dari perangkat ajar yang sudah dimiliki guru
    myPerangkatList.forEach((p: any) => {
      const mapelName = p.Mapel?.nama_mapel;
      if (mapelName && !subjectsMap.has(mapelName)) {
        subjectsMap.set(mapelName, {
          id: p.Mapel?.id || mapelName,
          name: mapelName,
          isAssigned: true
        });
      }
    });

    // 3. Fallback: jika belum ada data pengampuan, tampilkan pilihan dari template global
    if (subjectsMap.size === 0) {
      globalPresets.forEach(p => {
        if (p.nama_mapel_ref && !subjectsMap.has(p.nama_mapel_ref)) {
          subjectsMap.set(p.nama_mapel_ref, {
            id: p.nama_mapel_ref,
            name: p.nama_mapel_ref,
            isAssigned: false
          });
        }
      });
    }

    return Array.from(subjectsMap.values());
  }, [assignedMapelList, myPerangkatList, globalPresets]);

  // Active Subject for Chapter Map
  const activeSubjectName = useMemo(() => {
    if (selectedMapelFilter !== 'ALL' && distinctSubjects.some(s => s.name.toLowerCase() === selectedMapelFilter.toLowerCase())) {
      return selectedMapelFilter;
    }
    return distinctSubjects[0]?.name || 'Bahasa Indonesia';
  }, [selectedMapelFilter, distinctSubjects]);

  // Expand/Collapse state for each Fase (Default: expanded)
  const [expandedFases, setExpandedFases] = useState<Record<string, boolean>>({
    'E': true,
    'F': true,
  });

  const toggleFase = (faseKey: string) => {
    setExpandedFases(prev => ({
      ...prev,
      [faseKey]: !prev[faseKey]
    }));
  };

  // Grouped modules & presets per Fase for active subject
  const fasesData = useMemo(() => {
    const aMapel = activeSubjectName.toLowerCase().trim();

    // Presets for this subject
    const mapelPresets = globalPresets.filter(p => {
      const pMapel = (p.nama_mapel_ref || '').toLowerCase().trim();
      return (
        pMapel === aMapel ||
        pMapel.includes(aMapel) ||
        aMapel.includes(pMapel) ||
        p.tags?.some(t => t.toLowerCase().trim() === aMapel || aMapel.includes(t.toLowerCase().trim()))
      );
    });

    // Teacher's saved modules for this subject
    const mapelMyPerangkats = myPerangkatList.filter((p: any) =>
      (p.Mapel?.nama_mapel || '').toLowerCase().trim() === aMapel
    );

    const fases = [
      { key: 'E', name: 'Fase E (Kelas 10)', tingkat: 10 },
      { key: 'F', name: 'Fase F (Kelas 11-12)', tingkat: 11 },
    ];

    return fases.map(f => {
      const presetsInFase = mapelPresets
        .filter(p => p.fase === f.key)
        .sort((a, b) => extractModulNumber(a.judul_modul) - extractModulNumber(b.judul_modul));

      const myItemsInFase = mapelMyPerangkats.filter((mp: any) => mp.fase === f.key || (!mp.fase && f.key === 'E'));

      // Match preset with teacher's item
      const chapters = presetsInFase.map(preset => {
        const num = extractModulNumber(preset.judul_modul);
        const myItem = myItemsInFase.find((mp: any) =>
          mp.preset_ref_id === preset.id ||
          mp.judul?.toLowerCase().includes(preset.judul_modul.toLowerCase()) ||
          preset.judul_modul.toLowerCase().includes((mp.judul || '').toLowerCase()) ||
          extractModulNumber(mp.judul || '') === num
        );
        return {
          id: preset.id,
          babNumber: num < 999 ? num : 1,
          judul: preset.judul_modul,
          deskripsi: preset.deskripsi,
          total_pertemuan: preset.total_pertemuan,
          total_alokasi_jp: preset.total_alokasi_jp,
          preset,
          myItem: myItem || null,
          isReady: Boolean(myItem)
        };
      });

      // Include standalone custom modules created by teacher
      const unmatchedMyItems = myItemsInFase.filter(mp => 
        !chapters.some(c => c.myItem?.id === mp.id)
      );

      return {
        faseKey: f.key,
        faseName: f.name,
        tingkat: f.tingkat,
        chapters,
        customItems: unmatchedMyItems,
        totalCount: chapters.length + unmatchedMyItems.length,
        readyCount: chapters.filter(c => c.isReady).length + unmatchedMyItems.length
      };
    });
  }, [globalPresets, myPerangkatList, activeSubjectName]);

  const handleOpenReader = (id: string, ctx?: { mapelNama?: string; fase?: string; tingkat?: number }) => {
    setReaderPerangkatId(id);
    setReaderContext(ctx || {});
    setIsReaderOpen(true);
  };

  const handleOpenStudio = (item: any) => {
    const effectiveMapelName = item.mapelNama || item.Mapel?.nama_mapel || item.nama_mapel_ref || activeSubjectName;
    const matchedMapelObj = distinctSubjects.find(s => s.name.toLowerCase() === effectiveMapelName.toLowerCase());
    const resolvedMapelId = item.mapel_id || item.Mapel?.id || item.mapelId || matchedMapelObj?.id;

    setStudioPerangkat({
      id: item.id,
      judul: item.judul || item.judul_modul || `Modul Ajar: ${effectiveMapelName}`,
      mapelId: resolvedMapelId,
      mapelNama: effectiveMapelName,
      fase: item.fase || (selectedFaseFilter === 'ALL' ? 'E' : selectedFaseFilter),
      tingkat: item.tingkat || (selectedFaseFilter === 'F' ? 11 : 10)
    });
    setIsStudioOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* ── 1. PILIHAN MAPEL (BUKU BERDIRI) ── */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        {/* Pilihan Mapel Guru: Icon Buku Berdiri (Standing Book 3D) */}
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar max-w-full pb-0.5">
          {distinctSubjects.map((sub, idx) => {
            const isActive = activeSubjectName.toLowerCase() === sub.name.toLowerCase();
            const palette = BOOK_PALETTES[idx % BOOK_PALETTES.length];
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedMapelFilter(sub.name)}
                className={cn(
                  "px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2.5 border shrink-0 group select-none shadow-2xs",
                  isActive
                    ? `${palette.activeBg} ring-2 ring-blue-500/20 shadow-xs scale-[1.02]`
                    : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300"
                )}
              >
                <div className={cn(
                  "transition-transform duration-200 shrink-0",
                  isActive ? "scale-110 -translate-y-0.5" : "group-hover:scale-105"
                )}>
                  <StandingBookIcon
                    color={palette.main}
                    spineColor={palette.spine}
                    isActive={isActive}
                    className="w-5 h-6 sm:w-6 sm:h-7"
                  />
                </div>
                <div className="text-left">
                  <span className="block leading-tight font-extrabold text-xs sm:text-sm">{sub.name}</span>
                  {isActive && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block leading-none mt-0.5">
                      Buku Aktif
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. SAJIAN VERTIKAL ACCORDION PER FASE (EXPAND & COLLAPSE) ── */}
      <div className="space-y-4">
        {fasesData.map(fase => {
          const isExpanded = expandedFases[fase.faseKey] ?? true;
          const hasContent = fase.chapters.length > 0 || fase.customItems.length > 0;

          return (
            <div
              key={fase.faseKey}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden"
            >
              {/* Accordion Header (Click to Expand / Collapse) */}
              <button
                type="button"
                onClick={() => toggleFase(fase.faseKey)}
                className="w-full p-3.5 sm:p-4 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs shrink-0 border border-blue-200/60 dark:border-blue-800/60">
                    {fase.faseKey}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">
                      {fase.faseName}
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {fase.readyCount} dari {fase.totalCount} Modul Siap Mengajar
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider",
                    fase.readyCount > 0 && fase.readyCount === fase.totalCount
                      ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                      : "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300"
                  )}>
                    {fase.readyCount === fase.totalCount && fase.totalCount > 0 ? "Lengkap" : `${fase.totalCount} Bab`}
                  </span>

                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-200 dark:border-slate-700 shrink-0">
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </div>
              </button>

              {/* Accordion Body */}
              {isExpanded && (
                <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4 animate-in fade-in duration-200">
                  {!hasContent ? (
                    <div className="py-8 px-4 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Belum ada modul ajar tersimpan untuk {activeSubjectName} di {fase.faseName}.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleOpenStudio({
                          id: 'new',
                          judul: `Modul Ajar: ${activeSubjectName} (${fase.faseName})`,
                          mapelNama: activeSubjectName,
                          fase: fase.faseKey,
                          tingkat: fase.tingkat
                        })}
                        className="h-8 px-3.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 cursor-pointer mx-auto"
                      >
                        <Plus size={13} />
                        <span>Susun Modul di {fase.faseKey}</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {/* Presets / Chapters */}
                      {fase.chapters.map((ch) => (
                        <div
                          key={ch.id}
                          className={cn(
                            "p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 shadow-2xs",
                            ch.isReady
                              ? "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
                              : "bg-slate-50/50 dark:bg-slate-800/30 border-dashed border-slate-300 dark:border-slate-700"
                          )}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-[10px] font-mono">
                                BAB {ch.babNumber}
                              </span>

                              {ch.isReady ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] flex items-center gap-1">
                                  <CheckCircle2 size={11} />
                                  <span>SIAP AJAR</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px]">
                                  TEMPLATE
                                </span>
                              )}
                            </div>

                            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug line-clamp-2">
                              {ch.judul}
                            </h4>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {ch.total_pertemuan} Pertemuan • {ch.total_alokasi_jp} JP
                            </p>
                          </div>

                          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1.5">
                            {ch.isReady ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenReader(ch.myItem?.id || ch.id, { mapelNama: activeSubjectName, fase: fase.faseKey, tingkat: fase.tingkat })}
                                  className="h-8 px-2.5 rounded-xl text-xs font-bold border-amber-300/80 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 flex items-center gap-1 cursor-pointer"
                                >
                                  <Presentation size={13} className="text-amber-600" />
                                  <span>Proyektor</span>
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleOpenStudio(ch.myItem || ch.preset)}
                                  className="h-8 px-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 cursor-pointer"
                                >
                                  <Sparkles size={12} />
                                  <span>Edit</span>
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={adoptMutation.isPending}
                                  onClick={() => adoptMutation.mutate(ch.preset)}
                                  className="h-8 px-3 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                  <Zap size={12} className="text-amber-300 fill-amber-300" />
                                  <span>Pasang (1-Klik)</span>
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenReader(ch.id, { mapelNama: activeSubjectName, fase: fase.faseKey, tingkat: fase.tingkat })}
                                  className="h-8 px-2 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                  <BookOpen size={12} />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Custom User Modules */}
                      {fase.customItems.map((item: any) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3.5"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-[10px]">
                                {item.jenis?.replace('_', ' ') || 'MODUL AJAR'}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px]">
                                SIAP AJAR
                              </span>
                            </div>

                            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug line-clamp-2">
                              {item.judul}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Modul Mandiri Guru
                            </p>
                          </div>

                          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenReader(item.id, { mapelNama: activeSubjectName, fase: fase.faseKey, tingkat: fase.tingkat })}
                              className="h-8 px-2.5 rounded-xl text-xs font-bold border-amber-300/80 bg-amber-50/50 text-amber-700 dark:text-amber-300 flex items-center gap-1 cursor-pointer"
                            >
                              <Presentation size={13} className="text-amber-600" />
                              <span>Proyektor</span>
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleOpenStudio(item)}
                              className="h-8 px-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles size={12} />
                              <span>Edit</span>
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Add Bab Card */}
                      <button
                        type="button"
                        onClick={() => handleOpenStudio({
                          id: 'new',
                          judul: `Bab ${fase.totalCount + 1}: `,
                          mapelNama: activeSubjectName,
                          fase: fase.faseKey,
                          tingkat: fase.tingkat
                        })}
                        className="p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-blue-50/20 transition-all flex flex-col items-center justify-center text-center space-y-2 cursor-pointer min-h-[140px] group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Plus size={18} />
                        </div>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 group-hover:text-blue-600">
                          Susun Bab Baru ({fase.faseKey})
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── MODALS: READER & STUDIO ── */}
      {isReaderOpen && (
        <BahanAjarReaderModal
          isOpen={isReaderOpen}
          onClose={() => setIsReaderOpen(false)}
          perangkatId={readerPerangkatId}
          mapelNama={readerContext.mapelNama}
          fase={readerContext.fase}
          tingkat={readerContext.tingkat}
        />
      )}

      {isStudioOpen && studioPerangkat && (
        <ModulAjarStudioModal
          isOpen={isStudioOpen}
          onClose={() => {
            setIsStudioOpen(false);
            setStudioPerangkat(null);
          }}
          perangkatId={studioPerangkat.id}
          perangkatJudul={studioPerangkat.judul}
          mapelId={studioPerangkat.mapelId}
          mapelNama={studioPerangkat.mapelNama}
          guruId={guruId}
          fase={studioPerangkat.fase}
          tingkat={studioPerangkat.tingkat}
        />
      )}
    </div>
  );
};
