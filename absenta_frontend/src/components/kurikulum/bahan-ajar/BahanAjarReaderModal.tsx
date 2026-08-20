import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Sparkles,
  Clock,
  CheckCircle2,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  FileText,
  Users,
  Compass,
  ArrowRight,
  Sliders,
  Tv,
  Presentation,
  Check,
  ChevronUp,
  ChevronDown,
  Layers
} from 'lucide-react';
import { Modal, Button } from '../../ui';
import { getReaderContent, PertemuanItem, AvailableModulItem } from '../../../api/bahan-ajar.api';
import { toast } from 'react-hot-toast';
import { cn } from '../../../lib/utils';

interface BahanAjarReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  perangkatId?: string;
  mapelId?: string;
  mapelNama?: string;
  kelasNama?: string;
  tingkat?: number;
  fase?: string;
  onOpenJurnal?: (data: { judul_materi: string; deskripsi: string }) => void;
}

export type ProjectorTab = 'ALL' | 'PEMANTIK' | 'MATERI' | 'LKPD' | 'REFLEKSI';

export const BahanAjarReaderModal: React.FC<BahanAjarReaderModalProps> = ({
  isOpen,
  onClose,
  perangkatId,
  mapelId,
  mapelNama,
  kelasNama,
  tingkat,
  fase,
  onOpenJurnal
}) => {
  const [activePertemuanIdx, setActivePertemuanIdx] = useState<number>(0);
  const [isProjectorMode, setIsProjectorMode] = useState<boolean>(false);
  const [activeProjectorTab, setActiveProjectorTab] = useState<ProjectorTab>('PEMANTIK');
  const [fontSizeScale, setFontSizeScale] = useState<number>(1);
  const [selectedModulId, setSelectedModulId] = useState<string>('');

  // 1. Auto-detect Tingkat & Fase dari Nama Kelas jika belum disediakan
  const detectedContext = useMemo(() => {
    let resolvedTingkat = tingkat;
    let resolvedFase = fase;

    if (kelasNama) {
      const upper = kelasNama.toUpperCase().trim();
      if (upper.startsWith('XII') || upper.startsWith('12')) {
        resolvedTingkat = 12;
        resolvedFase = 'F';
      } else if (upper.startsWith('XI') || upper.startsWith('11')) {
        resolvedTingkat = 11;
        resolvedFase = 'F';
      } else if (upper.startsWith('X') || upper.startsWith('10')) {
        resolvedTingkat = 10;
        resolvedFase = 'E';
      }
    }

    return {
      tingkat: resolvedTingkat,
      fase: resolvedFase,
      mapel_nama: mapelNama,
      mapel_id: mapelId
    };
  }, [kelasNama, tingkat, fase, mapelNama, mapelId]);

  const effectiveTargetId = selectedModulId || perangkatId || mapelId || 'auto';

  // 2. Fetch Reader Content dengan Context Filter
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bahanAjarReader', effectiveTargetId, detectedContext.fase, detectedContext.tingkat, detectedContext.mapel_nama],
    queryFn: () => getReaderContent(effectiveTargetId, {
      fase: detectedContext.fase,
      tingkat: detectedContext.tingkat,
      mapel_nama: detectedContext.mapel_nama,
      mapel_id: detectedContext.mapel_id
    }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000
  });

  const availableModuls: AvailableModulItem[] = useMemo(() => {
    return data?.available_moduls || [];
  }, [data]);

  const pertemuanList: PertemuanItem[] = useMemo(() => {
    return data?.konten || [];
  }, [data]);

  const currentPertemuan: PertemuanItem | undefined = pertemuanList[activePertemuanIdx];

  // Fullscreen helper
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsProjectorMode(true);
      toast.success('🖥️ Mode Proyektor Layar Penuh Aktif!', { icon: '📽️' });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsProjectorMode(false);
    }
  }, []);

  // Keyboard navigation for projector slides
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (isProjectorMode) {
          const tabs: ProjectorTab[] = ['PEMANTIK', 'MATERI', 'LKPD', 'REFLEKSI'];
          const curIdx = tabs.indexOf(activeProjectorTab);
          if (curIdx < tabs.length - 1) {
            setActiveProjectorTab(tabs[curIdx + 1]);
          } else if (activePertemuanIdx < pertemuanList.length - 1) {
            setActivePertemuanIdx(prev => prev + 1);
            setActiveProjectorTab('PEMANTIK');
          }
        }
      } else if (e.key === 'ArrowLeft') {
        if (isProjectorMode) {
          const tabs: ProjectorTab[] = ['PEMANTIK', 'MATERI', 'LKPD', 'REFLEKSI'];
          const curIdx = tabs.indexOf(activeProjectorTab);
          if (curIdx > 0) {
            setActiveProjectorTab(tabs[curIdx - 1]);
          } else if (activePertemuanIdx > 0) {
            setActivePertemuanIdx(prev => prev - 1);
            setActiveProjectorTab('REFLEKSI');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProjectorMode, activeProjectorTab, activePertemuanIdx, pertemuanList.length]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setActivePertemuanIdx(0);
      setIsProjectorMode(false);
      setActiveProjectorTab('PEMANTIK');
      setSelectedModulId('');
    }
  }, [isOpen, perangkatId, mapelId, kelasNama]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        onClose();
      }}
      zIndex={85}
      size="full"
      className={cn(
        "h-[98vh] max-h-[98vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300",
        isProjectorMode 
          ? "bg-slate-950 border-amber-500/40 text-slate-100 p-0" 
          : "bg-slate-50 dark:bg-slate-900 border-slate-200/90 dark:border-slate-800"
      )}
      title={
        <div className="flex items-center justify-between w-full pr-6 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-2xl shadow-md transition-all",
              isProjectorMode ? "bg-amber-500 text-slate-950 font-black shadow-amber-500/20" : "bg-blue-600 text-white shadow-blue-500/20"
            )}>
              {isProjectorMode ? <Presentation className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Module Selector Dropdown if multiple exist */}
                {availableModuls.length > 1 ? (
                  <select
                    value={data?.perangkat?.id || selectedModulId}
                    onChange={(e) => {
                      setSelectedModulId(e.target.value);
                      setActivePertemuanIdx(0);
                    }}
                    className={cn(
                      "font-black text-sm rounded-xl px-2.5 py-1 border cursor-pointer",
                      isProjectorMode 
                        ? "bg-slate-900 text-amber-300 border-amber-500/40"
                        : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700"
                    )}
                  >
                    {availableModuls.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.judul} (Fase {m.fase})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={cn(
                    "font-black text-base tracking-tight",
                    isProjectorMode ? "text-amber-400" : "text-slate-900 dark:text-white"
                  )}>
                    {data?.perangkat?.judul || 'Bahan Ajar Digital & Panduan KBM'}
                  </span>
                )}

                {/* Badges: Fase & Kelas */}
                {kelasNama && (
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-black text-[10px]">
                    {kelasNama}
                  </span>
                )}

                {(data?.perangkat?.fase || detectedContext.fase) && (
                  <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-extrabold text-[10px]">
                    Fase {data?.perangkat?.fase || detectedContext.fase}
                  </span>
                )}

                {isProjectorMode && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-[10px] animate-pulse">
                    📽️ MODE PROYEKTOR AKTIF
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {data?.perangkat?.Mapel?.nama_mapel || detectedContext.mapel_nama || 'Kurikulum Merdeka'} • {pertemuanList.length} Pertemuan • Alokasi {data?.perangkat?.total_alokasi_jp || 18} JP
              </p>
            </div>
          </div>

          {/* Quick Header Controls */}
          <div className="flex items-center gap-2">
            {/* Font Scale Controls */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => setFontSizeScale(prev => Math.max(0.85, prev - 0.1))}
                className="px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                title="Kecilkan Font"
              >
                A-
              </button>
              <span className="text-[10px] font-mono px-1 text-slate-400 font-bold">
                {Math.round(fontSizeScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setFontSizeScale(prev => Math.min(1.5, prev + 0.1))}
                className="px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                title="Besarkan Font"
              >
                A+
              </button>
            </div>

            {/* Projector / Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className={cn(
                "h-9 px-3.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md",
                isProjectorMode
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-amber-500/30"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-500/20"
              )}
            >
              {isProjectorMode ? <Minimize2 size={14} /> : <Presentation size={14} />}
              <span>{isProjectorMode ? 'Keluar Proyektor' : '📽️ Mode Proyektor'}</span>
            </button>
          </div>
        </div>
      }
    >
      {/* ── MODE 1: PROJECTOR PRESENTATION STAGE (FULLSCREEN PROJEKTOR SISWA) ── */}
      {isProjectorMode ? (
        <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
          {/* Projector Top Slide Tabs */}
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs">
                PERTEMUAN {currentPertemuan?.nomor_pertemuan || activePertemuanIdx + 1}
              </span>
              <span className="text-xs font-bold text-slate-400">
                {currentPertemuan?.topik}
              </span>
            </div>

            {/* Stage Tabs (Tahap KBM) */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveProjectorTab('PEMANTIK')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer",
                  activeProjectorTab === 'PEMANTIK'
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <HelpCircle size={14} />
                <span>1. Pemantik &amp; Apersepsi</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveProjectorTab('MATERI')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer",
                  activeProjectorTab === 'MATERI'
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <BookOpen size={14} />
                <span>2. Teks Bacaan Pokok</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveProjectorTab('LKPD')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer",
                  activeProjectorTab === 'LKPD'
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Users size={14} />
                <span>3. Lembar Diskusi / LKPD</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveProjectorTab('REFLEKSI')}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer",
                  activeProjectorTab === 'REFLEKSI'
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Compass size={14} />
                <span>4. Refleksi Kelas</span>
              </button>
            </div>
          </div>

          {/* Projector Slide Body (Giant Display for Students in Back Row) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 sm:p-12 flex flex-col justify-center max-w-5xl mx-auto w-full">
            {/* SLIDE 1: PERTANYAAN PEMANTIK & APERSEPSI */}
            {activeProjectorTab === 'PEMANTIK' && currentPertemuan && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-amber-400" />
                  <span>Tahap 1: Pertanyaan Pemantik &amp; Mindful Learning (15 Menit)</span>
                </div>

                <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/90 border-2 border-amber-500/40 shadow-2xl space-y-6">
                  <p className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-200 leading-relaxed italic">
                    "{currentPertemuan.langkah_kbm?.pendahuluan?.kegiatan?.find(k => k.includes('Pemantik'))?.replace('Pertanyaan Pemantik: ', '') || currentPertemuan.topik}"
                  </p>

                  <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
                    {currentPertemuan.langkah_kbm?.pendahuluan?.kegiatan?.filter(k => !k.includes('Pemantik')).map((item, i) => (
                      <div key={i} className="flex items-start gap-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                        <span className="text-amber-400 font-bold">▶</span>
                        <p className="font-medium leading-normal">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 2: TEKS BACAAN POKOK / MATERI INTI */}
            {activeProjectorTab === 'MATERI' && currentPertemuan && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="p-4 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-300 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <span>Tahap 2: Teks Observasi &amp; Eksplorasi Konsep (105 Menit)</span>
                </div>

                <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/90 border-2 border-blue-500/40 shadow-2xl space-y-6">
                  <h3 className="text-2xl sm:text-3xl font-black text-blue-300">
                    {currentPertemuan.langkah_kbm?.inti?.teks_bacaan?.judul || currentPertemuan.topik}
                  </h3>

                  <div className="space-y-4 text-base sm:text-lg text-slate-200 leading-relaxed">
                    {currentPertemuan.langkah_kbm?.inti?.teks_bacaan?.paragraf?.map((p, i) => (
                      <p key={i} className="indent-6 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 3: LEMBAR KERJA DISKUSI (LKPD) */}
            {activeProjectorTab === 'LKPD' && currentPertemuan && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span>Tahap 3: Lembar Kerja Peserta Didik &amp; Diskusi Kelompok</span>
                </div>

                <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/90 border-2 border-emerald-500/40 shadow-2xl space-y-6">
                  <h3 className="text-2xl sm:text-3xl font-black text-emerald-300">
                    {currentPertemuan.langkah_kbm?.inti?.lkpd?.judul || 'Petunjuk Tugas Kelompok'}
                  </h3>

                  <pre className="font-sans text-base sm:text-xl text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950 p-6 rounded-2xl border border-emerald-500/30">
                    {currentPertemuan.langkah_kbm?.inti?.lkpd?.petunjuk}
                  </pre>
                </div>
              </div>
            )}

            {/* SLIDE 4: REFLEKSI & PENUTUP */}
            {activeProjectorTab === 'REFLEKSI' && currentPertemuan && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="p-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-400" />
                  <span>Tahap 4: Refleksi Akhir Pembelajaran &amp; Rangkuman (15 Menit)</span>
                </div>

                <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/90 border-2 border-indigo-500/40 shadow-2xl space-y-6">
                  <div className="space-y-4">
                    {currentPertemuan.langkah_kbm?.penutup?.kegiatan?.map((kg, i) => (
                      <div key={i} className="p-5 rounded-2xl bg-slate-950 border border-indigo-500/30 flex items-start gap-3 text-base sm:text-lg text-slate-200 font-medium">
                        <span className="text-indigo-400 font-black">✔</span>
                        <p>{kg}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Projector Stage Bottom Control Bar */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => {
                  const tabs: ProjectorTab[] = ['PEMANTIK', 'MATERI', 'LKPD', 'REFLEKSI'];
                  const curIdx = tabs.indexOf(activeProjectorTab);
                  if (curIdx > 0) setActiveProjectorTab(tabs[curIdx - 1]);
                  else if (activePertemuanIdx > 0) {
                    setActivePertemuanIdx(prev => prev - 1);
                    setActiveProjectorTab('REFLEKSI');
                  }
                }}
                className="h-10 px-4 rounded-xl font-black text-xs bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Slide Sebelumnya (Panah Kiri)</span>
              </Button>

              <Button
                type="button"
                onClick={() => {
                  const tabs: ProjectorTab[] = ['PEMANTIK', 'MATERI', 'LKPD', 'REFLEKSI'];
                  const curIdx = tabs.indexOf(activeProjectorTab);
                  if (curIdx < tabs.length - 1) setActiveProjectorTab(tabs[curIdx + 1]);
                  else if (activePertemuanIdx < pertemuanList.length - 1) {
                    setActivePertemuanIdx(prev => prev + 1);
                    setActiveProjectorTab('PEMANTIK');
                  }
                }}
                className="h-10 px-4 rounded-xl font-black text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>Slide Selanjutnya (Panah Kanan)</span>
                <ChevronRight size={16} />
              </Button>
            </div>

            <Button
              type="button"
              onClick={() => {
                if (currentPertemuan && onOpenJurnal) {
                  onOpenJurnal({
                    judul_materi: currentPertemuan.topik,
                    deskripsi: (currentPertemuan.tujuan_pembelajaran || []).join('. ') || currentPertemuan.topik
                  });
                }
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
                onClose();
                toast.success(`⚡ 1-Klik: Membuka Jurnal untuk '${currentPertemuan?.topik}'`, { icon: '✍️' });
              }}
              className="h-10 px-6 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-900/40"
            >
              <CheckCircle2 size={16} />
              <span>Selesai Mengajar ➔ Isi Jurnal KBM</span>
            </Button>
          </div>
        </div>
      ) : (
        /* ── MODE 2: DESKTOP / TABLET READER VIEW ── */
        <div className="flex flex-1 overflow-hidden">
          {/* ── SIDEBAR KIRI: DAFTAR PERTEMUAN (Navigasi KBM) ── */}
          <div className="w-64 sm:w-72 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 flex flex-col gap-2 shrink-0 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-[11px] font-black tracking-wider uppercase text-slate-400 dark:text-slate-500">
                Agenda Pertemuan
              </span>
              <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 font-mono">
                {activePertemuanIdx + 1} / {pertemuanList.length || 1}
              </span>
            </div>

            {isLoading && (
              <div className="space-y-2 py-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            )}

            {!isLoading && pertemuanList.length === 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 text-center space-y-1 text-amber-800 dark:text-amber-200 text-xs">
                <Sparkles className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                <p className="font-bold">Belum ada data materi</p>
                <p className="text-[11px] opacity-80">Gunakan preset nasional atau generate AI.</p>
              </div>
            )}

            {!isLoading && pertemuanList.map((pt, idx) => {
              const isActive = idx === activePertemuanIdx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePertemuanIdx(idx)}
                  className={cn(
                    "p-3 rounded-2xl text-left transition-all cursor-pointer border flex flex-col gap-1 text-xs relative",
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-700 shadow-sm"
                      : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "font-black text-[11px] px-2 py-0.5 rounded-md",
                      isActive
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                    )}>
                      Pertemuan {pt.nomor_pertemuan || idx + 1}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {pt.alokasi_jp || 3} JP ({pt.durasi_menit || 135}m)
                    </span>
                  </div>
                  <p className={cn(
                    "font-bold text-xs line-clamp-2 leading-snug pt-0.5",
                    isActive ? "text-blue-900 dark:text-blue-100" : "text-slate-700 dark:text-slate-300"
                  )}>
                    {pt.topik}
                  </p>
                </button>
              );
            })}
          </div>

          {/* ── AREA UTAMA: CLASSROOM TEACHING READER CONTENT ── */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-950">
            {isLoading && (
              <div className="flex-1 flex items-center justify-center p-12 text-slate-400 gap-2">
                <span className="animate-spin text-2xl">⏳</span>
                <span className="font-bold text-sm">Memuat materi bahan ajar...</span>
              </div>
            )}

            {!isLoading && currentPertemuan && (
              <div
                className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8 space-y-6"
                style={{ fontSize: `${fontSizeScale * 100}%` }}
              >
                {/* Header Pertemuan */}
                <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-blue-500/10 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-white/20 backdrop-blur-xs font-black text-xs">
                        PERTEMUAN {currentPertemuan.nomor_pertemuan}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-blue-100">
                        <Clock size={13} />
                        <span>{currentPertemuan.alokasi_jp} JP • {currentPertemuan.durasi_menit} Menit</span>
                      </span>
                    </div>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black tracking-tight leading-snug">
                    {currentPertemuan.topik}
                  </h2>
                  {currentPertemuan.tujuan_pembelajaran && currentPertemuan.tujuan_pembelajaran.length > 0 && (
                    <div className="pt-2 border-t border-white/15 space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                        Tujuan Pembelajaran:
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-xs text-blue-50 font-medium">
                        {currentPertemuan.tujuan_pembelajaran.map((tp, i) => (
                          <li key={i}>{tp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* ── 1. PENDAHULUAN & PERTANYAAN PEMANTIK (15 MENIT) ── */}
                {currentPertemuan.langkah_kbm?.pendahuluan && (
                  <div className="p-5 rounded-3xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-sm">
                        <HelpCircle className="w-4 h-4 text-amber-600" />
                        <span>1. Pendahuluan, Apersepsi &amp; Pertanyaan Pemantik</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-black text-xs font-mono">
                        {currentPertemuan.langkah_kbm.pendahuluan.durasi_menit || 15} Menit
                      </span>
                    </div>

                    <div className="space-y-2">
                      {currentPertemuan.langkah_kbm.pendahuluan.kegiatan.map((kg, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                          <span className="text-amber-600 font-bold">▶</span>
                          <p>{kg}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── 2. KEGIATAN INTI & TEKS BACAAN MATERI (105 MENIT) ── */}
                {currentPertemuan.langkah_kbm?.inti && (
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-black text-sm">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>2. Kegiatan Inti &amp; Eksplorasi Konsep</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-200 font-black text-xs font-mono">
                        {currentPertemuan.langkah_kbm.inti.durasi_menit || 105} Menit
                      </span>
                    </div>

                    {/* Runtutan Kegiatan Inti */}
                    <div className="space-y-2">
                      {currentPertemuan.langkah_kbm.inti.kegiatan.map((kg, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                          <span className="text-blue-600 font-bold">•</span>
                          <p>{kg}</p>
                        </div>
                      ))}
                    </div>

                    {/* Teks Bacaan Materi (Jika ada) */}
                    {currentPertemuan.langkah_kbm.inti.teks_bacaan && (
                      <div className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-900/60 shadow-xs space-y-3">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-black text-xs uppercase tracking-wider">
                          <BookOpen size={14} />
                          <span>Teks Bacaan Siswa: {currentPertemuan.langkah_kbm.inti.teks_bacaan.judul}</span>
                        </div>
                        <div className="space-y-2 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                          {currentPertemuan.langkah_kbm.inti.teks_bacaan.paragraf.map((p, idx) => (
                            <p key={idx} className="indent-4">{p}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* LKPD / Tugas Siswa (Jika ada) */}
                    {currentPertemuan.langkah_kbm.inti.lkpd && (
                      <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-xs">
                          <Users size={14} />
                          <span>{currentPertemuan.langkah_kbm.inti.lkpd.judul}</span>
                        </div>
                        <pre className="font-sans text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {currentPertemuan.langkah_kbm.inti.lkpd.petunjuk}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* ── 3. PENUTUP & REFLEKSI (15 MENIT) ── */}
                {currentPertemuan.langkah_kbm?.penutup && (
                  <div className="p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-black text-sm">
                        <Compass className="w-4 h-4 text-indigo-600" />
                        <span>3. Penutup, Refleksi &amp; Rangkuman</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 font-black text-xs font-mono">
                        {currentPertemuan.langkah_kbm.penutup.durasi_menit || 15} Menit
                      </span>
                    </div>

                    <div className="space-y-2">
                      {currentPertemuan.langkah_kbm.penutup.kegiatan.map((kg, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                          <span className="text-indigo-600 font-bold">✔</span>
                          <p>{kg}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STICKY FOOTER TOOLBAR MENGJAR ── */}
            <div className="p-4 sm:p-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              {/* Navigasi Prev/Next Pertemuan */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={activePertemuanIdx === 0}
                  onClick={() => setActivePertemuanIdx(prev => Math.max(0, prev - 1))}
                  className="h-10 px-3 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  <span className="hidden sm:inline">Pertemuan Sebelumnya</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={activePertemuanIdx === pertemuanList.length - 1}
                  onClick={() => setActivePertemuanIdx(prev => Math.min(pertemuanList.length - 1, prev + 1))}
                  className="h-10 px-3 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <span className="hidden sm:inline">Pertemuan Selanjutnya</span>
                  <ChevronRight size={14} />
                </Button>
              </div>

              {/* Aksi Selesai Mengajar ➔ Buka Jurnal */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    if (currentPertemuan) {
                      if (onOpenJurnal) {
                        onOpenJurnal({
                          judul_materi: currentPertemuan.topik,
                          deskripsi: (currentPertemuan.tujuan_pembelajaran || []).join('. ') || currentPertemuan.topik
                        });
                      }
                      onClose();
                      toast.success(`⚡ 1-Klik: Membuka Jurnal untuk '${currentPertemuan.topik}'`, { icon: '✍️' });
                    }
                  }}
                  className="h-10 px-5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <CheckCircle2 size={15} />
                  <span>Selesai Mengajar ➔ Isi Jurnal KBM</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
