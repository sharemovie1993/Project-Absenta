import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Plus, ExternalLink, FileText, Download,
  Search, CheckCircle2, Sparkles, Folder, Presentation,
  Globe, UserCheck, Clock, Layers, ChevronRight, AlertCircle,
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

interface PerangkatAjarPanelProps {
  guruId?: string;
}

export const PerangkatAjarPanel: React.FC<PerangkatAjarPanelProps> = ({ guruId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMainTab, setActiveMainTab] = useState<'READINESS_MAP' | 'GLOBAL_PRESETS' | 'ALL_DOCS'>('READINESS_MAP');
  const [selectedMapelFilter, setSelectedMapelFilter] = useState<string>('ALL');
  const [selectedFaseFilter, setSelectedFaseFilter] = useState<string>('E');

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

  // Chapter Readiness Calculation for Active Subject (Sorted in natural ascending order)
  const subjectPresets = useMemo(() => {
    const filtered = globalPresets.filter(p => {
      const matchSubject = p.nama_mapel_ref.toLowerCase() === activeSubjectName.toLowerCase() ||
        p.tags?.some(t => t.toLowerCase() === activeSubjectName.toLowerCase());
      
      const matchFase = selectedFaseFilter === 'ALL' || p.fase === selectedFaseFilter;
      return matchSubject && matchFase;
    });

    // Natural ascending sort (Modul 1 -> Modul 2 -> Modul 3 ...)
    return filtered.sort((a, b) => {
      if (a.fase !== b.fase) return a.fase.localeCompare(b.fase);
      return extractModulNumber(a.judul_modul) - extractModulNumber(b.judul_modul);
    });
  }, [globalPresets, activeSubjectName, selectedFaseFilter]);

  const subjectMyPerangkats = useMemo(() => {
    return myPerangkatList.filter((p: any) =>
      p.Mapel?.nama_mapel?.toLowerCase() === activeSubjectName.toLowerCase()
    );
  }, [myPerangkatList, activeSubjectName]);

  // Matched Chapters (List of all required chapters for this subject)
  const chaptersReadiness = useMemo(() => {
    return subjectPresets.map((preset) => {
      const num = extractModulNumber(preset.judul_modul);

      // Find if teacher has a custom/adopted module matching this preset or chapter
      const myItem = subjectMyPerangkats.find((mp: any) =>
        mp.preset_ref_id === preset.id ||
        mp.judul?.toLowerCase().includes(preset.judul_modul.toLowerCase()) ||
        preset.judul_modul.toLowerCase().includes((mp.judul || '').toLowerCase()) ||
        extractModulNumber(mp.judul || '') === num
      );

      return {
        babNumber: num < 999 ? num : 1,
        preset,
        myItem: myItem || null,
        isReady: Boolean(myItem)
      };
    });
  }, [subjectPresets, subjectMyPerangkats]);

  const readyCount = chaptersReadiness.filter(c => c.isReady).length;
  const totalCount = Math.max(chaptersReadiness.length, 1);
  const readinessPercent = Math.round((readyCount / totalCount) * 100);

  const handleOpenReader = (id: string, ctx?: { mapelNama?: string; fase?: string; tingkat?: number }) => {
    setReaderPerangkatId(id);
    setReaderContext(ctx || {});
    setIsReaderOpen(true);
  };

  const handleOpenStudio = (item: any) => {
    setStudioPerangkat({
      id: item.id,
      judul: item.judul || item.judul_modul,
      mapelNama: item.Mapel?.nama_mapel || item.nama_mapel_ref,
      fase: item.fase,
      tingkat: item.tingkat
    });
    setIsStudioOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* ── 1. BANNER KESIAPAN MENGAJAR GURU (STATUS & PROGRESS) ── */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white shadow-xl shadow-indigo-950/20 border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-black uppercase tracking-wider">
                Asisten Administrasi &amp; KBM Guru
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black">
                Semester Ganjil 2026/2027
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-black text-white leading-snug">
              Status Kelengkapan Modul Ajar: <span className="text-indigo-300">{activeSubjectName}</span>
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Pastikan seluruh bab pembelajaran telah memiliki modul terdaftar agar panduan mengajar, materi slide proyektor, dan jurnal KBM otomatis aktif di ruang kelas.
            </p>
          </div>

          {/* KPI Widget Cards */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[100px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200 block">
                Kelengkapan
              </span>
              <span className="text-xl font-black text-white font-mono">
                {readinessPercent}%
              </span>
              <span className="text-[10px] text-slate-300 block">
                {readyCount} dari {totalCount} Bab
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-center min-w-[100px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                Siap Mengajar
              </span>
              <span className="text-xl font-black text-emerald-300 font-mono">
                {readyCount}
              </span>
              <span className="text-[10px] text-emerald-200/80 block">
                Bab Aktif
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/20 backdrop-blur-md border border-amber-400/30 text-center min-w-[100px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                Perlu Dilengkapi
              </span>
              <span className="text-xl font-black text-amber-300 font-mono">
                {Math.max(0, totalCount - readyCount)}
              </span>
              <span className="text-[10px] text-amber-200/80 block">
                Bab Kosong
              </span>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-300">Progres Kesiapan Modul Ajar Semester Ini</span>
            <span className="text-indigo-300 font-mono font-black">{readinessPercent}% Siap Mengajar</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-teal-400 to-emerald-400 transition-all duration-700"
              style={{ width: `${Math.max(8, readinessPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── 2. PILIHAN MATA PELAJARAN & SUB-TABS NAVIGASI ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
        {/* Mapel & Fase Switcher Chips */}
        <div className="flex items-center gap-3 overflow-x-auto max-w-full pb-1 flex-wrap">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">
              Pilih Mapel:
            </span>
            {distinctSubjects.map(sub => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedMapelFilter(sub.name)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                  activeSubjectName.toLowerCase() === sub.name.toLowerCase()
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100"
                )}
              >
                <span>{sub.name}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 shrink-0 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setSelectedFaseFilter('E')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer",
                selectedFaseFilter === 'E'
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Fase E (Kelas 10)
            </button>
            <button
              type="button"
              onClick={() => setSelectedFaseFilter('F')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer",
                selectedFaseFilter === 'F'
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Fase F (Kelas 11-12)
            </button>
            <button
              type="button"
              onClick={() => setSelectedFaseFilter('ALL')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer",
                selectedFaseFilter === 'ALL'
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              Semua
            </button>
          </div>
        </div>

        {/* View Modes */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
          <button
            type="button"
            onClick={() => setActiveMainTab('READINESS_MAP')}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1",
              activeMainTab === 'READINESS_MAP'
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <BookCheck size={13} />
            <span>Peta Bab ({chaptersReadiness.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('GLOBAL_PRESETS')}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1",
              activeMainTab === 'GLOBAL_PRESETS'
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Globe size={13} />
            <span>Katalog Nasional ({globalPresets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('ALL_DOCS')}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1",
              activeMainTab === 'ALL_DOCS'
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Folder size={13} />
            <span>Semua Berkas ({myPerangkatList.length})</span>
          </button>
        </div>
      </div>

      {/* ── 3. TAB UTAMA 1: PETA BAB PEMBELAJARAN (KESIAPAN MENGAJAR) ── */}
      {activeMainTab === 'READINESS_MAP' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Daftar Bab Pembelajaran: {activeSubjectName}
            </span>
            <span className="text-xs font-bold text-slate-400">
              Klik Pasang Template atau Susun untuk melengkapi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chaptersReadiness.map(({ babNumber, preset, myItem, isReady }) => (
              <div
                key={preset.id}
                className={cn(
                  "p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 relative overflow-hidden",
                  isReady
                    ? "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md"
                    : "bg-amber-50/40 dark:bg-amber-950/15 border-dashed border-2 border-amber-200/80 dark:border-amber-900/60"
                )}
              >
                <div className="space-y-2.5">
                  {/* Status Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-[11px] font-mono">
                      BAB {babNumber}
                    </span>

                    {isReady ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-black text-[10px] flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>SIAP MENGAJAR</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-black text-[10px] flex items-center gap-1">
                        <AlertCircle size={12} />
                        <span>BELUM DILENGKAPI</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Details */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                      {preset.judul_modul}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Fase {preset.fase} (Kelas {preset.tingkat || 10}) • {preset.total_pertemuan} Pertemuan • {preset.total_alokasi_jp} JP
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {preset.deskripsi}
                  </p>
                </div>

                {/* Bottom Action Row */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  {isReady ? (
                    <>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck size={13} />
                        <span>Tersimpan di Akun Guru</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleOpenStudio(myItem || preset)}
                          className="h-8 px-3 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 cursor-pointer"
                          title="Edit materi dan pertemuan di Studio"
                        >
                          <Sparkles size={12} />
                          <span>Edit di Studio</span>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenReader(myItem?.id || preset.id, { mapelNama: preset.nama_mapel_ref, fase: preset.fase, tingkat: preset.tingkat })}
                          className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                          title="Buka panduan mengajar & layar proyektor"
                        >
                          <Presentation size={13} className="text-amber-500" />
                          <span>Proyektor</span>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                        Template siap diadopsi
                      </span>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={adoptMutation.isPending}
                          onClick={() => adoptMutation.mutate(preset)}
                          className="h-8 px-3 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                          title="Otomatis salin seluruh langkah KBM dan teks materi ke modul mengajar Anda"
                        >
                          <Zap size={13} className="text-amber-300 fill-amber-300" />
                          <span>Pasang Template (1-Klik)</span>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenStudio(preset)}
                          className="h-8 px-2.5 rounded-xl text-xs font-bold border-slate-300 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                          title="Susun sendiri dari nol atau sesuaikan template"
                        >
                          <span>Susun</span>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. TAB UTAMA 2: KATALOG NASIONAL LENGKAP ── */}
      {activeMainTab === 'GLOBAL_PRESETS' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalPresets.map((preset) => (
              <div
                key={preset.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3.5 hover:shadow-md transition-shadow"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-extrabold text-[10px]">
                      Fase {preset.fase} (Kelas {preset.tingkat || 10})
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                      TEMPLATE NASIONAL
                    </span>
                  </div>

                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {preset.judul_modul}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {preset.nama_mapel_ref} • {preset.total_pertemuan} Pertemuan ({preset.total_alokasi_jp} JP)
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Button
                    type="button"
                    size="sm"
                    disabled={adoptMutation.isPending}
                    onClick={() => adoptMutation.mutate(preset)}
                    className="h-8 px-3 rounded-xl text-[11px] font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Zap size={12} className="text-amber-300 fill-amber-300" />
                    <span>Adopsi Modul</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenReader(preset.id, { mapelNama: preset.nama_mapel_ref, fase: preset.fase, tingkat: preset.tingkat })}
                    className="h-8 px-3 rounded-xl text-[11px] font-bold border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <BookOpen size={12} />
                    <span>Buka Reader</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. TAB UTAMA 3: SEMUA BERKAS ADMINISTRASI ── */}
      {activeMainTab === 'ALL_DOCS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              Seluruh berkas administrasi KBM guru (Modul Ajar, ATP, PROTA, PROMES)
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => navigate('/kurikulum/perangkat')}
              className="text-xs font-bold bg-indigo-600 text-white"
            >
              <Plus size={13} className="mr-1" />
              Kelola Repositori Lengkap
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myPerangkatList.map((item: any) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3.5"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px]">
                      {item.jenis?.replace('_', ' ') || 'MODUL AJAR'}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-md font-extrabold text-[10px]",
                      item.status === 'APPROVED' ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" :
                      item.status === 'REJECTED' ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400" :
                      "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                    )}>
                      {item.status || 'DRAF'}
                    </span>
                  </div>

                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {item.judul}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {item.Mapel?.nama_mapel || 'Mata Pelajaran'} • {item.TahunPelajaran?.tahun || ''}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleOpenStudio(item)}
                    className="h-8 px-2.5 rounded-xl text-[11px] font-black bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={12} />
                    <span>Susun</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenReader(item.id, { mapelNama: item.Mapel?.nama_mapel })}
                    className="h-8 px-2.5 rounded-xl text-[11px] font-bold border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Presentation size={12} className="text-amber-500" />
                    <span>Proyektor</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          mapelNama={studioPerangkat.mapelNama}
          fase={studioPerangkat.fase}
          tingkat={studioPerangkat.tingkat}
        />
      )}
    </div>
  );
};
