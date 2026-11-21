import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  DoorOpen,
  BookOpen,
  GraduationCap,
  Briefcase,
  AlertTriangle,
  Clock,
  Sparkles,
  Info,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui';

export interface MapelMatrixItem {
  id: string;
  nama_mapel: string;
  kode_mapel?: string;
}

export interface DayMatrixRecord {
  date: string;
  day: number;
  day_name: string;
  is_weekend: boolean;
  gerbang?: {
    datang_waktu?: string | null;
    datang_status?: string | null;
    pulang_waktu?: string | null;
    pulang_status?: string | null;
    is_terlambat?: boolean;
    is_tap_gantung?: boolean;
  };
  pembiasaan?: {
    status?: string | null;
    nama?: string | null;
  };
  mapel_sessions: Record<string, {
    status: string;
    waktu?: string | null;
    guru?: string | null;
    jp?: number;
  } | null>;
  pkl?: {
    status?: string | null;
    mitra?: string | null;
  };
  final_status: string;
  anomali?: {
    is_anomali: boolean;
    tipe?: string;
    pesan?: string;
  };
}

export interface MapelMatrixData {
  mapel_list: MapelMatrixItem[];
  dates: string[];
  records: DayMatrixRecord[];
  summary_per_mapel: Record<string, {
    nama_mapel: string;
    total_sesi: number;
    hadir: number;
    alpa: number;
    persentase: number;
  }>;
}

interface MapelMultiChannelMatrixTableProps {
  matrixData?: MapelMatrixData;
  bulan: string;
  selectedDate?: string;
  onDateSelect?: (dateStr: string) => void;
  isLoading?: boolean;
  className?: string;
}

export const MapelMultiChannelMatrixTable: React.FC<MapelMultiChannelMatrixTableProps> = React.memo(({
  matrixData,
  bulan,
  selectedDate,
  onDateSelect,
  isLoading = false,
  className,
}) => {
  const mapelList = matrixData?.mapel_list || [];
  const records = matrixData?.records || [];
  const summaryPerMapel = matrixData?.summary_per_mapel || {};

  // Summary Gate
  const gateSummary = useMemo(() => {
    let hadir = 0;
    let total = 0;
    records.forEach((r) => {
      if (!r.is_weekend && r.final_status !== 'LIBUR') {
        total++;
        if (r.gerbang?.datang_status === 'HADIR' || r.gerbang?.datang_status === 'TERLAMBAT') {
          hadir++;
        }
      }
    });
    const pct = total > 0 ? Math.round((hadir / total) * 100) : 100;
    return { hadir, total, pct };
  }, [records]);

  // Summary Pembiasaan
  const pembiasaanSummary = useMemo(() => {
    let hadir = 0;
    let total = 0;
    records.forEach((r) => {
      if (r.pembiasaan?.status) {
        total++;
        if (r.pembiasaan.status === 'HADIR') hadir++;
      }
    });
    const pct = total > 0 ? Math.round((hadir / total) * 100) : 100;
    return { hadir, total, pct };
  }, [records]);

    // ── FITUR ZOOM & FREE-HAND PAN KHUSUS HP (PORTRAIT / LAYAR SEMPIT) ──
  const TABLE_NATURAL_WIDTH = 1360;
  const deskRef = useRef<HTMLDivElement | null>(null);
  const [mobileViewStyle, setMobileViewStyle] = useState<'CANVAS_360' | 'SPREADSHEET'>('CANVAS_360');
  const [zoomScale, setZoomScale] = useState<number>(0.28);
  const [fitScale, setFitScale] = useState<number>(0.28);
  const [zoomMode, setZoomMode] = useState<'fit' | 'custom'>('fit');
  const [isHandToolActive, setIsHandToolActive] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Gesture refs
  const dragStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const touchDistanceRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1);
  const lastTapRef = useRef<number>(0);
  const hasMovedRef = useRef<boolean>(false);

  // Auto-calculate fit scale based on container width
  useEffect(() => {
    const calcFit = () => {
      if (!deskRef.current) return;
      const w = deskRef.current.clientWidth;
      if (w > 0) {
        // Leave 12px padding
        const calculated = Math.max(0.20, Math.min(1.0, +((w - 12) / TABLE_NATURAL_WIDTH).toFixed(3)));
        setFitScale(calculated);
      }
    };
    calcFit();
    const timer = setTimeout(calcFit, 150);
    window.addEventListener('resize', calcFit);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calcFit);
    };
  }, []);

  const effectiveScale = zoomMode === 'fit' ? fitScale : zoomScale;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && deskRef.current) {
      hasMovedRef.current = false;
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        scrollLeft: deskRef.current.scrollLeft,
        scrollTop: deskRef.current.scrollTop,
      };
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      dragStartRef.current = null;
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
      touchStartScaleRef.current = effectiveScale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && dragStartRef.current && deskRef.current && isHandToolActive) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasMovedRef.current = true;
      }
      deskRef.current.scrollLeft = dragStartRef.current.scrollLeft - dx;
      deskRef.current.scrollTop = dragStartRef.current.scrollTop - dy;
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchDistanceRef.current;
      const next = Math.max(0.20, Math.min(2.5, +(touchStartScaleRef.current * ratio).toFixed(2)));
      setZoomScale(next);
      setZoomMode('custom');
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    dragStartRef.current = null;
    touchDistanceRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !deskRef.current || !isHandToolActive) return;
    hasMovedRef.current = false;
    const startX = e.clientX;
    const startY = e.clientY;
    const startScrollLeft = deskRef.current.scrollLeft;
    const startScrollTop = deskRef.current.scrollTop;
    setIsDragging(true);

    const onMouseMove = (ev: MouseEvent) => {
      if (!deskRef.current) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasMovedRef.current = true;
      }
      deskRef.current.scrollLeft = startScrollLeft - dx;
      deskRef.current.scrollTop = startScrollTop - dy;
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      if (zoomMode === 'fit' || Math.abs(effectiveScale - fitScale) < 0.05) {
        setZoomScale(1.0);
        setZoomMode('custom');
      } else {
        setZoomMode('fit');
      }
    }
    lastTapRef.current = now;
  };

  const handleZoomIn = () => {
    const steps = [0.25, 0.35, 0.5, 0.65, 0.8, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];
    const next = steps.find((s) => s > effectiveScale + 0.04) || 2.5;
    setZoomScale(next);
    setZoomMode('custom');
  };

  const handleZoomOut = () => {
    const steps = [0.25, 0.35, 0.5, 0.65, 0.8, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];
    const next = [...steps].reverse().find((s) => s < effectiveScale - 0.04) || 0.25;
    setZoomScale(next);
    setZoomMode('custom');
  };

  const handleToggleFit = () => {
    if (zoomMode === 'fit' || Math.abs(effectiveScale - fitScale) < 0.05) {
      setZoomScale(1.0);
      setZoomMode('custom');
    } else {
      setZoomMode('fit');
    }
  };

  // Safe Click Handler: Hindari trigger jika pengguna sedang drag/pan
  const handleCellClick = (date: string) => {
    if (hasMovedRef.current) return;
    onDateSelect?.(date);
  };

  // Fungsi Render Tabel Spreadsheet Tunggal (DRY untuk Desktop & Mobile)
  const renderSpreadsheetTable = (isCanvas: boolean = false) => (
    <table className={cn('border-collapse text-left text-xs', isCanvas ? 'w-[1360px]' : 'w-full min-w-[1200px]')}>
            {/* ── THEAD (TANGGAL 01 .. 31) ── */}
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200">
                {/* Kolom Sticky Kiri: Channel / Mapel */}
                <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 font-black uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 min-w-[210px] max-w-[240px] border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  Channel / Sesi Pembelajaran
                </th>

                {/* Kolom Tanggal 1..31 */}
                {records.map((r) => {
                  const isSelected = selectedDate === r.date;
                  return (
                    <th
                      key={r.date}
                      onClick={() => handleCellClick(r.date)}
                      className={cn(
                        'px-1 py-1.5 text-center min-w-[34px] max-w-[38px] cursor-pointer transition-colors border-r border-slate-100 dark:border-slate-800/60 group select-none',
                        r.is_weekend
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60',
                        isSelected &&
                          'bg-primary/10 dark:bg-primary/20 text-primary font-black ring-2 ring-primary ring-inset'
                      )}
                      title={`Klik untuk melihat linimasa tanggal ${r.date}`}
                    >
                      <div className="text-[11px] font-black leading-tight">
                        {String(r.day).padStart(2, '0')}
                      </div>
                      <div className="text-[8px] uppercase tracking-tighter opacity-80">
                        {r.day_name}
                      </div>
                    </th>
                  );
                })}

                {/* Kolom Sticky Kanan: Total / Persentase */}
                <th className="sm:sticky sm:right-0 z-20 bg-slate-50 dark:bg-slate-900 px-2.5 py-2.5 text-center font-black uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 min-w-[95px] border-l border-slate-200 dark:border-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  Total Rekap
                </th>
              </tr>
            </thead>

            {/* ── TBODY ── */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
              {/* ── KATEGORI 1: GERBANG SEKOLAH ── */}
              <tr className="bg-indigo-50/30 dark:bg-indigo-950/20 font-bold text-[10px] text-indigo-700 dark:text-indigo-300">
                <td
                  colSpan={records.length + 2}
                  className="px-3 py-1 uppercase tracking-widest border-l-4 border-indigo-500"
                >
                  Pintu Gerbang Sekolah
                </td>
              </tr>

              {/* Baris Gerbang Datang */}
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-1.5 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] flex items-center gap-1.5 truncate">
                  <DoorOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">Tap Masuk Gerbang</span>
                </td>

                {records.map((r) => {
                  const g = r.gerbang;
                  const hasTap = Boolean(g?.datang_waktu);
                  const isLate = Boolean(g?.is_terlambat);
                  const isSelected = selectedDate === r.date;

                  return (
                    <td
                      key={`g-in-${r.date}`}
                      onClick={() => handleCellClick(r.date)}
                      className={cn(
                        'px-0.5 py-1 text-center font-mono text-[9px] border-r border-slate-100 dark:border-slate-800/60 cursor-pointer',
                        r.is_weekend && 'bg-slate-50/30 dark:bg-slate-950/20 text-slate-300',
                        isSelected && 'bg-primary/5 dark:bg-primary/10'
                      )}
                      title={hasTap ? `Tap Masuk: ${g?.datang_waktu} (${g?.datang_status})` : 'Tidak Tap'}
                    >
                      {hasTap ? (
                        <span
                          className={cn(
                            'px-1 py-0.5 rounded font-bold leading-none inline-block text-[8.5px]',
                            isLate
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          )}
                        >
                          {g?.datang_waktu}
                        </span>
                      ) : r.is_weekend ? (
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                  );
                })}

                <td className="sm:sticky sm:right-0 z-10 bg-white dark:bg-slate-900 px-2 py-1 text-center font-bold text-slate-800 dark:text-slate-200 border-l border-slate-200 dark:border-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] text-[10px]">
                  {gateSummary.hadir}/{gateSummary.total} ({gateSummary.pct}%)
                </td>
              </tr>

              {/* Baris Gerbang Pulang */}
              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-1.5 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] flex items-center gap-1.5 truncate">
                  <DoorOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">Tap Pulang Gerbang</span>
                </td>

                {records.map((r) => {
                  const g = r.gerbang;
                  const hasPulang = Boolean(g?.pulang_waktu);
                  const isGantung = Boolean(g?.is_tap_gantung);
                  const isSelected = selectedDate === r.date;

                  return (
                    <td
                      key={`g-out-${r.date}`}
                      onClick={() => handleCellClick(r.date)}
                      className={cn(
                        'px-0.5 py-1 text-center font-mono text-[9px] border-r border-slate-100 dark:border-slate-800/60 cursor-pointer',
                        r.is_weekend && 'bg-slate-50/30 dark:bg-slate-950/20 text-slate-300',
                        isSelected && 'bg-primary/5 dark:bg-primary/10'
                      )}
                      title={
                        hasPulang
                          ? `Tap Pulang: ${g?.pulang_waktu}`
                          : isGantung
                          ? '⚠️ Tap Gantung (Masuk tapi tidak tap pulang)'
                          : '-'
                      }
                    >
                      {hasPulang ? (
                        <span className="px-1 py-0.5 rounded font-bold leading-none inline-block text-[8.5px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {g?.pulang_waktu}
                        </span>
                      ) : isGantung ? (
                        <span className="px-1 py-0.5 rounded font-bold leading-none inline-block text-[8px] bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200/60">
                          ⚠️
                        </span>
                      ) : r.is_weekend ? (
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                  );
                })}

                <td className="sm:sticky sm:right-0 z-10 bg-white dark:bg-slate-900 px-2 py-1 text-center font-semibold text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] text-[10px]">
                  {records.filter((r) => r.gerbang?.pulang_waktu).length} Tap
                </td>
              </tr>

              {/* ── KATEGORI 2: PEMBIASAAN PAGI ── */}
              <tr className="bg-emerald-50/30 dark:bg-emerald-950/20 font-bold text-[10px] text-emerald-700 dark:text-emerald-300">
                <td
                  colSpan={records.length + 2}
                  className="px-3 py-1 uppercase tracking-widest border-l-4 border-emerald-500"
                >
                  Pembiasaan Pagi (Dhuha / Upacara / Apel)
                </td>
              </tr>

              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-1.5 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] flex items-center gap-1.5 truncate">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">Sesi Pembiasaan</span>
                </td>

                {records.map((r) => {
                  const p = r.pembiasaan;
                  const isSelected = selectedDate === r.date;

                  return (
                    <td
                      key={`p-${r.date}`}
                      onClick={() => handleCellClick(r.date)}
                      className={cn(
                        'px-0.5 py-1 text-center font-bold text-[9px] border-r border-slate-100 dark:border-slate-800/60 cursor-pointer',
                        r.is_weekend && 'bg-slate-50/30 dark:bg-slate-950/20 text-slate-300',
                        isSelected && 'bg-primary/5 dark:bg-primary/10'
                      )}
                      title={p?.status ? `Pembiasaan: ${p.nama || 'Dhuha/Apel'} (${p.status})` : 'Tidak Ada Sesi'}
                    >
                      {p?.status === 'HADIR' ? (
                        <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 inline-flex items-center justify-center text-[9px]">
                          H
                        </span>
                      ) : p?.status === 'ALPA' ? (
                        <span className="w-5 h-5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 inline-flex items-center justify-center text-[9px]">
                          A
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 font-mono">·</span>
                      )}
                    </td>
                  );
                })}

                <td className="sm:sticky sm:right-0 z-10 bg-white dark:bg-slate-900 px-2 py-1 text-center font-bold text-slate-800 dark:text-slate-200 border-l border-slate-200 dark:border-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] text-[10px]">
                  {pembiasaanSummary.hadir}/{pembiasaanSummary.total} ({pembiasaanSummary.pct}%)
                </td>
              </tr>

              {/* ── KATEGORI 3: SESI KBM PER MATA PELAJARAN ── */}
              <tr className="bg-amber-50/30 dark:bg-amber-950/20 font-bold text-[10px] text-amber-700 dark:text-amber-300">
                <td
                  colSpan={records.length + 2}
                  className="px-3 py-1 uppercase tracking-widest border-l-4 border-amber-500"
                >
                  Sesi Belajar KBM per Mata Pelajaran
                </td>
              </tr>

              {mapelList.map((mapel) => {
                const mapelSum = summaryPerMapel[mapel.id] || {
                  total_sesi: 0,
                  hadir: 0,
                  alpa: 0,
                  persentase: 100,
                };

                return (
                  <tr
                    key={mapel.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-1.5 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate max-w-[240px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <GraduationCap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate" title={mapel.nama_mapel}>
                          {mapel.nama_mapel}
                        </span>
                      </div>
                    </td>

                    {/* Sel Tanggal untuk Mapel ini */}
                    {records.map((r) => {
                      const session = r.mapel_sessions[mapel.id];
                      const isSelected = selectedDate === r.date;

                      return (
                        <td
                          key={`${mapel.id}-${r.date}`}
                          onClick={() => handleCellClick(r.date)}
                          className={cn(
                            'px-0.5 py-1 text-center font-bold text-[9px] border-r border-slate-100 dark:border-slate-800/60 cursor-pointer',
                            r.is_weekend && 'bg-slate-50/30 dark:bg-slate-950/20 text-slate-300',
                            isSelected && 'bg-primary/5 dark:bg-primary/10'
                          )}
                          title={
                            session
                              ? `${mapel.nama_mapel} pada ${r.date}: ${session.status} ${
                                  session.waktu ? `(${session.waktu})` : ''
                                }`
                              : `Tidak ada jadwal ${mapel.nama_mapel} pada tanggal ini`
                          }
                        >
                          {session ? (
                            session.status === 'HADIR' || session.status === 'TEPAT_WAKTU' ? (
                              <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 inline-flex items-center justify-center text-[9px]">
                                H
                              </span>
                            ) : session.status === 'TERLAMBAT' ? (
                              <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 inline-flex items-center justify-center text-[9px]">
                                T
                              </span>
                            ) : session.status === 'ALPA' ? (
                              <span className="w-5 h-5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 inline-flex items-center justify-center text-[9px] shadow-2xs">
                                A
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 inline-flex items-center justify-center text-[9px]">
                                {session.status.slice(0, 1)}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 font-mono">·</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Summary Mapel */}
                    <td className="sm:sticky sm:right-0 z-10 bg-white dark:bg-slate-900 px-2 py-1 text-center font-bold border-l border-slate-200 dark:border-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] text-[10px]">
                      <span
                        className={cn(
                          mapelSum.persentase < 85
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-800 dark:text-slate-200'
                        )}
                      >
                        {mapelSum.hadir}/{mapelSum.total_sesi} ({mapelSum.persentase}%)
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* ── KATEGORI 4: REKAP STATUS & ANOMALI ── */}
              <tr className="bg-slate-100/70 dark:bg-slate-800/60 font-bold text-[10px] text-slate-700 dark:text-slate-300">
                <td
                  colSpan={records.length + 2}
                  className="px-3 py-1 uppercase tracking-widest border-l-4 border-slate-500"
                >
                  Status Harian & Indikasi Anomali
                </td>
              </tr>

              {/* Baris Status Harian */}
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 font-bold">
                <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate">
                  Status Akhir Harian
                </td>

                {records.map((r) => {
                  const isSelected = selectedDate === r.date;
                  return (
                    <td
                      key={`final-${r.date}`}
                      onClick={() => handleCellClick(r.date)}
                      className={cn(
                        'px-0.5 py-1 text-center font-black text-[9px] border-r border-slate-100 dark:border-slate-800/60 cursor-pointer',
                        r.is_weekend && 'text-slate-300 dark:text-slate-600',
                        isSelected && 'bg-primary/10'
                      )}
                      title={`Status Akhir ${r.date}: ${r.final_status}`}
                    >
                      {r.final_status === 'HADIR' ? (
                        <span className="text-emerald-600 dark:text-emerald-400">H</span>
                      ) : r.final_status === 'TERLAMBAT' ? (
                        <span className="text-purple-600 dark:text-purple-400">T</span>
                      ) : r.final_status === 'ALPA' ? (
                        <span className="text-rose-600 dark:text-rose-400">A</span>
                      ) : r.is_weekend ? (
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  );
                })}

                <td className="sm:sticky sm:right-0 z-10 bg-slate-50 dark:bg-slate-900 px-2 py-1 text-center font-black text-indigo-600 dark:text-indigo-400 border-l border-slate-200 dark:border-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] text-[10.5px]">
                  Rekap
                </td>
              </tr>

              {/* Baris Anomali */}
              <tr>
                <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-1.5 font-bold text-rose-600 dark:text-rose-400 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] flex items-center gap-1 truncate">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Deteksi Anomali</span>
                </td>

                {records.map((r) => {
                  const anomali = r.anomali;
                  const isSelected = selectedDate === r.date;

                  return (
                    <td
                      key={`ano-${r.date}`}
                      onClick={() => handleCellClick(r.date)}
                      className={cn(
                        'px-0.5 py-1 text-center border-r border-slate-100 dark:border-slate-800/60 cursor-pointer',
                        isSelected && 'bg-primary/5'
                      )}
                      title={anomali?.pesan || 'Normal'}
                    >
                      {anomali?.is_anomali ? (
                        <span
                          className="w-4 h-4 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 inline-flex items-center justify-center text-[9px] font-black animate-pulse"
                          title={anomali.pesan}
                        >
                          !
                        </span>
                      ) : (
                        <span className="text-slate-200 dark:text-slate-800">·</span>
                      )}
                    </td>
                  );
                })}

                <td className="sm:sticky sm:right-0 z-10 bg-white dark:bg-slate-900 px-2 py-1 text-center font-bold text-rose-600 dark:text-rose-400 border-l border-slate-200 dark:border-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] text-[10px]">
                  {records.filter((r) => r.anomali?.is_anomali).length} Kasus
                </td>
              </tr>
            </tbody>
          </table>
  );

if (isLoading) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="w-8 h-8 mx-auto border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Memuat matriks multi-channel 30 hari...
        </p>
      </div>
    );
  }

  if (!matrixData || records.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
        <Info className="w-8 h-8 mx-auto text-slate-400" />
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Matriks Presensi Belum Tersedia
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Belum ada jadwal sesi pelajaran atau rekaman presensi pada bulan <span className="font-semibold">{bulan}</span> untuk siswa ini.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3 w-full max-w-full min-w-0', className)}>
      {/* HEADER & PANDUAN SIMBOL */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div>
          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Matriks Presensi Multi-Channel 1 Bulan Penuh</span>
          </h4>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
            Bentang horizontal seluruh sesi KBM mata pelajaran, pembiasaan pagi, gerbang, dan anomali.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 flex-wrap text-[9.5px] font-semibold text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold inline-flex items-center justify-center text-[9px]">
              H
            </span>
            Hadir
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold inline-flex items-center justify-center text-[9px]">
              T
            </span>
            Terlambat
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold inline-flex items-center justify-center text-[9px]">
              A
            </span>
            Alpa
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="font-mono font-bold text-slate-400">·</span>
            Non-Jadwal
          </span>
        </div>
      </div>

      {/* MOBILE TOGGLE: 360° ZOOM & FREE-HAND PAN vs SPREADSHEET */}
      <div className="flex sm:hidden items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full">
        <button
          type="button"
          onClick={() => setMobileViewStyle('CANVAS_360')}
          className={cn(
            'flex-1 py-1.5 text-[11px] font-black rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5',
            mobileViewStyle === 'CANVAS_360'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          )}
        >
          <Hand className="w-3.5 h-3.5" />
          <span>Full 360° (Zoom & Geser)</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileViewStyle('SPREADSHEET')}
          className={cn(
            'flex-1 py-1.5 text-[11px] font-black rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5',
            mobileViewStyle === 'SPREADSHEET'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          )}
        >
          <span>📊 Spreadsheet Klasik</span>
        </button>
      </div>

      {/* ── 1. TAMPILAN KHUSUS HP (SM:HIDDEN) ── */}
      <div className="block sm:hidden">
        {mobileViewStyle === 'CANVAS_360' ? (
          <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/80 shadow-inner">
            {/* Guide Info Banner */}
            <div className="px-3 py-1.5 bg-slate-200/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 text-[10px] flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <span className="font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Cubit untuk Zoom, geser 1 jari di tabel untuk navigasi 360°.
              </span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black">
                {Math.round(effectiveScale * 100)}%
              </span>
            </div>

            {/* Canvas Desk Area */}
            <div
              ref={deskRef}
              onTouchStart={(e) => {
                handleTouchStart(e);
                handleDoubleTap();
              }}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              className={cn(
                'overflow-auto overscroll-contain max-h-[72vh] touch-none select-none relative',
                isHandToolActive ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
              )}
            >
              <div className="min-w-full w-max flex justify-center p-1.5">
                <div
                  style={{
                    zoom: effectiveScale,
                    width: `${TABLE_NATURAL_WIDTH}px`,
                  }}
                  className="origin-top"
                >
                  <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-800">
                    {renderSpreadsheetTable(true)}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Quick Zoom Pill */}
            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-700 shadow-lg text-xs select-none">
              <button
                type="button"
                onClick={() => setIsHandToolActive((prev) => !prev)}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10.5px] font-semibold cursor-pointer flex items-center gap-1 transition-colors',
                  isHandToolActive
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
                title="Mode Geser Bebas (Pan)"
              >
                <Hand className="w-3.5 h-3.5" />
                <span>Geser</span>
              </button>
              <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={effectiveScale <= 0.22}
                className="p-1 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                title="Perkecil (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleToggleFit}
                className="px-1.5 py-0.5 font-bold text-[10.5px] min-w-[38px] text-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-800 dark:text-slate-200"
                title="Klik untuk beralih Pas Layar / 100%"
              >
                {Math.round(effectiveScale * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={effectiveScale >= 2.45}
                className="p-1 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                title="Perbesar (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto relative">
              {renderSpreadsheetTable(false)}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. TAMPILAN NORMAL DESKTOP (HIDDEN SM:BLOCK) ── */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto relative">
          {renderSpreadsheetTable(false)}
        </div>
      </div>
    </div>
  );
});

MapelMultiChannelMatrixTable.displayName = 'MapelMultiChannelMatrixTable';
