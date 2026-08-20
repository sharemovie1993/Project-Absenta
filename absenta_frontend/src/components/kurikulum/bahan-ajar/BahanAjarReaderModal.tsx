import React, { useState, useEffect, useMemo } from 'react';
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
  Printer,
  X
} from 'lucide-react';
import { Modal, Button } from '../../ui';
import { getReaderContent, PertemuanItem } from '../../../api/bahan-ajar.api';
import { toast } from 'react-hot-toast';
import { cn } from '../../../lib/utils';

interface BahanAjarReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  perangkatId: string;
  onOpenJurnal?: (data: { judul_materi: string; deskripsi: string }) => void;
}

export const BahanAjarReaderModal: React.FC<BahanAjarReaderModalProps> = ({
  isOpen,
  onClose,
  perangkatId,
  onOpenJurnal
}) => {
  const [activePertemuanIdx, setActivePertemuanIdx] = useState<number>(0);
  const [isProjectorMode, setIsProjectorMode] = useState<boolean>(false);
  const [fontSizeScale, setFontSizeScale] = useState<number>(1); // 0.9, 1, 1.15, 1.3

  // Fetch Reader Content
  const { data, isLoading, isError } = useQuery({
    queryKey: ['bahanAjarReader', perangkatId],
    queryFn: () => getReaderContent(perangkatId),
    enabled: isOpen && Boolean(perangkatId),
    staleTime: 5 * 60 * 1000
  });

  const pertemuanList: PertemuanItem[] = useMemo(() => {
    return data?.konten || [];
  }, [data]);

  const currentPertemuan: PertemuanItem | undefined = pertemuanList[activePertemuanIdx];

  // Reset active pertemuan when modal opens
  useEffect(() => {
    if (isOpen) {
      setActivePertemuanIdx(0);
      setIsProjectorMode(false);
    }
  }, [isOpen, perangkatId]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={85}
      size="full"
      className={cn(
        "h-[96vh] max-h-[96vh] flex flex-col rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden transition-all",
        isProjectorMode ? "bg-slate-950 text-slate-100" : "bg-slate-50/50 dark:bg-slate-900"
      )}
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 dark:text-white text-base">
                  {data?.perangkat?.judul || 'Bahan Ajar Digital & Panduan KBM'}
                </span>
                {data?.perangkat?.fase && (
                  <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-extrabold text-[10px]">
                    Fase {data.perangkat.fase}
                  </span>
                )}
                {data?.source === 'PRESET' && (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                    Preset Nasional ✨
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {data?.perangkat?.Mapel?.nama_mapel || 'Kurikulum Merdeka'} • {pertemuanList.length} Pertemuan • Alokasi {data?.perangkat?.total_alokasi_jp || 18} JP
              </p>
            </div>
          </div>

          {/* Quick Header Controls */}
          <div className="hidden sm:flex items-center gap-2">
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
                onClick={() => setFontSizeScale(prev => Math.min(1.35, prev + 0.1))}
                className="px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                title="Besarkan Font"
              >
                A+
              </button>
            </div>

            {/* Projector / Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsProjectorMode(!isProjectorMode);
                toast.success(
                  isProjectorMode ? 'Mode Baca Normal' : '🖥️ Mode Proyektor Kelas Aktif!',
                  { icon: '📽️' }
                );
              }}
              className={cn(
                "h-9 px-3.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border",
                isProjectorMode
                  ? "bg-amber-500 text-white border-amber-400"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              )}
            >
              {isProjectorMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span>{isProjectorMode ? 'Keluar Proyektor' : 'Mode Proyektor'}</span>
            </button>
          </div>
        </div>
      }
    >
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
    </Modal>
  );
};
