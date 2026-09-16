import React, { useState, useMemo, useEffect } from 'react';
import { History, Printer, Calendar, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui';
import { formatDate } from '../../utils/layoutUtils';
import { getTimezoneLabel } from '../../utils/attendance/time';
import { renderDailyTimeline } from '../../utils/hubinUtils';
import { PklStatusBadge } from './PklStatusBadge';

interface JurnalJson {
  status?: 'MENUNGGU_REVIEW' | 'REVISI' | 'DISETUJUI';
  catatan_revisi?: string;
}

interface StudentPklJurnal {
  Pembimbing?: { nama_guru?: string };
  jurnal_json?: JurnalJson;
}

interface SubmitJurnalMutation {
  mutate?: (url: string) => void;
  isPending?: boolean;
}

interface AbsensiItem {
  id: string;
  tanggal: string;
  status?: string;
  is_verified?: boolean;
  jam_masuk?: string;
  jam_pulang?: string;
  kegiatan?: string;
  image_url?: string;
  image_url_out?: string;
  is_outside_radius?: boolean;
  distance_meters?: number;
  address_snapshot?: string;
}

interface HubinStudentJurnalTabProps {
  studentPkl?: StudentPklJurnal | null;
  jurnalUrl?: string;
  setJurnalUrl?: (val: string) => void;
  submitJurnalMutation?: SubmitJurnalMutation;
  onPrint?: () => void;
  rawAbsensiHistory: AbsensiItem[];
}

export const HubinStudentJurnalTab: React.FC<HubinStudentJurnalTabProps> = React.memo(({
  onPrint,
  rawAbsensiHistory
}) => {
  const [filter, setFilter] = useState<'ALL' | 'HADIR' | 'IZIN' | 'PENDING'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [visibleLimit, setVisibleLimit] = useState<number>(15);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 1. Ekstraksi Daftar Bulan Unik dari Riwayat (Auto-Grouping)
  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, string>();
    (rawAbsensiHistory || []).forEach(a => {
      if (a.tanggal) {
        const ym = a.tanggal.slice(0, 7); // "YYYY-MM"
        if (ym.length === 7 && !monthsMap.has(ym)) {
          try {
            const [year, month] = ym.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            const label = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            monthsMap.set(ym, label);
          } catch {
            monthsMap.set(ym, ym);
          }
        }
      }
    });
    return Array.from(monthsMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [rawAbsensiHistory]);

  // 2. Filter Berdasarkan Bulan Terpilih
  const historyInMonth = useMemo(() => {
    if (selectedMonth === 'ALL') return rawAbsensiHistory || [];
    return (rawAbsensiHistory || []).filter(a => a.tanggal?.startsWith(selectedMonth));
  }, [rawAbsensiHistory, selectedMonth]);

  // 3. Metrik Ringkas Sesuai Bulan
  const totalDays = historyInMonth.length;
  const hadirCount = useMemo(() => historyInMonth.filter(a => (a.status || '').toUpperCase() === 'HADIR').length, [historyInMonth]);
  const izinCount = useMemo(() => historyInMonth.filter(a => ['IZIN', 'SAKIT', 'DISPENSASI'].includes((a.status || '').toUpperCase())).length, [historyInMonth]);
  const pendingCount = useMemo(() => historyInMonth.filter(a => !a.is_verified).length, [historyInMonth]);

  // 4. Filter Status Kehadiran
  const filteredHistory = useMemo(() => {
    const list = [...historyInMonth].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    if (filter === 'HADIR') return list.filter(a => (a.status || '').toUpperCase() === 'HADIR');
    if (filter === 'IZIN') return list.filter(a => ['IZIN', 'SAKIT', 'DISPENSASI'].includes((a.status || '').toUpperCase()));
    if (filter === 'PENDING') return list.filter(a => !a.is_verified);
    return list;
  }, [historyInMonth, filter]);

  // 5. Paginasi / Chunking untuk Performa Tinggi
  const displayedHistory = useMemo(() => {
    return filteredHistory.slice(0, visibleLimit);
  }, [filteredHistory, visibleLimit]);

  // Auto-expand 2 item teratas & item yang pending
  useEffect(() => {
    const initial = new Set<string>();
    filteredHistory.forEach((abs, idx) => {
      if (idx < 2 || !abs.is_verified) {
        initial.add(abs.id || String(idx));
      }
    });
    setExpandedIds(initial);
    setVisibleLimit(15);
  }, [selectedMonth, filter]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedIds.size >= displayedHistory.length) {
      setExpandedIds(new Set());
    } else {
      const all = new Set<string>();
      displayedHistory.forEach((abs, idx) => all.add(abs.id || String(idx)));
      setExpandedIds(all);
    }
  };

  const getActivitySummary = (abs: AbsensiItem) => {
    let count = 0;
    try {
      if (abs.kegiatan) {
        const parsed = JSON.parse(abs.kegiatan);
        if (Array.isArray(parsed)) count = parsed.length;
      }
    } catch {}

    const parts: string[] = [];
    if (abs.jam_masuk) parts.push(abs.jam_masuk.slice(0, 5));
    if (abs.jam_pulang) parts.push(abs.jam_pulang.slice(0, 5));

    const timeStr = parts.length > 0 ? parts.join(' - ') : '';
    const logStr = count > 0 ? `${count} kegiatan` : '';

    if (timeStr && logStr) return `${timeStr} • ${logStr}`;
    if (timeStr) return timeStr;
    if (logStr) return logStr;
    return 'Presensi Terdata';
  };

  return (
    <div className="space-y-3.5">
      {/* 1. Bar Pemilih Bulan & Cetak PDF */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center">
            <Calendar size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedMonth}
              aria-label="Pilih Periode Bulan"
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-7.5 pl-7 pr-7 text-[11px] font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs appearance-none"
            >
              <option value="ALL">Semua Periode ({rawAbsensiHistory?.length || 0} hari)</option>
              {availableMonths.map(([ym, label]) => {
                const count = (rawAbsensiHistory || []).filter(a => a.tanggal?.startsWith(ym)).length;
                return (
                  <option key={ym} value={ym}>
                    {label} ({count} hari)
                  </option>
                );
              })}
            </select>
            <ChevronDown size={12} className="absolute right-2 text-slate-400 pointer-events-none" />
          </div>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            • Zona {getTimezoneLabel()}
          </span>
        </div>

        {onPrint && (
          <Button
            size="sm"
            variant="outline"
            onClick={onPrint}
            className="h-7.5 px-2.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs shrink-0"
          >
            <Printer size={12} />
            <span>Cetak PDF</span>
          </Button>
        )}
      </div>

      {/* 2. Interactive Stat & Filter Cards */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
            filter === 'ALL'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xs ring-2 ring-slate-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
          }`}
        >
          <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider block ${filter === 'ALL' ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'}`}>
            Semua
          </span>
          <span className="text-xs sm:text-sm font-black mt-0.5 block">{totalDays}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('HADIR')}
          className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
            filter === 'HADIR'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-300'
          }`}
        >
          <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider block ${filter === 'HADIR' ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
            Hadir
          </span>
          <span className={`text-xs sm:text-sm font-black mt-0.5 block ${filter === 'HADIR' ? 'text-white' : 'text-emerald-700 dark:text-emerald-300'}`}>
            {hadirCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('IZIN')}
          className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
            filter === 'IZIN'
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-300'
          }`}
        >
          <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider block ${filter === 'IZIN' ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'}`}>
            Izin/Sakit
          </span>
          <span className={`text-xs sm:text-sm font-black mt-0.5 block ${filter === 'IZIN' ? 'text-white' : 'text-blue-700 dark:text-blue-300'}`}>
            {izinCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('PENDING')}
          className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
            filter === 'PENDING'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-400/30'
              : pendingCount > 0
                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 text-slate-600 dark:text-slate-400 hover:border-amber-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
          }`}
        >
          <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider block ${
            filter === 'PENDING'
              ? 'text-amber-100'
              : pendingCount > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-400'
          }`}>
            Pending
          </span>
          <span className={`text-xs sm:text-sm font-black mt-0.5 block ${
            filter === 'PENDING'
              ? 'text-white'
              : pendingCount > 0
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-slate-600 dark:text-slate-400'
          }`}>
            {pendingCount}
          </span>
        </button>
      </div>

      {/* 3. Header List + Toggle Expand All */}
      {filteredHistory.length > 0 && (
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Daftar Aktivitas ({filteredHistory.length} hari)
          </span>
          <button
            type="button"
            onClick={toggleExpandAll}
            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            {expandedIds.size >= displayedHistory.length ? 'Ringkas Semua' : 'Buka Semua'}
          </button>
        </div>
      )}

      {/* 4. History List (Collapsible Accordion Cards) */}
      <div className="space-y-2">
        {displayedHistory && displayedHistory.length > 0 ? (
          displayedHistory.map((abs, idx) => {
            const cardId = abs.id || String(idx);
            const isExpanded = expandedIds.has(cardId);
            const dateFormatted = abs.tanggal
              ? formatDate(abs.tanggal, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
              : '-';
            const summaryText = getActivitySummary(abs);

            return (
              <div
                key={cardId}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all shadow-2xs overflow-hidden"
              >
                {/* Header Kartu Harian (Click to Toggle) */}
                <div
                  onClick={() => toggleExpand(cardId)}
                  className={`p-3 sm:p-3.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isExpanded
                      ? 'border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/20'
                      : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                      {dateFormatted}
                    </span>
                    {!isExpanded && (
                      <span className="text-[10px] text-slate-400 font-medium truncate hidden sm:inline">
                        • {summaryText}
                      </span>
                    )}
                    {abs.is_verified ? (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/50 shrink-0">
                        Terverifikasi
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100/50 shrink-0">
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <PklStatusBadge status={abs.status || 'HADIR'} />
                    <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </div>
                  </div>
                </div>

                {/* Body Timeline Logbook (Hanya muncul jika Expanded) */}
                {isExpanded && (
                  <div className="p-3 sm:p-4 pt-2 sm:pt-3">
                    {renderDailyTimeline(abs)}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 sm:p-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-2.5 text-slate-300 dark:text-slate-600">
              <FileText size={24} />
            </div>
            <h6 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 uppercase mb-0.5">
              Belum Ada Riwayat
            </h6>
            <p className="text-[11px] text-slate-400 font-medium max-w-xs">
              {filter !== 'ALL' || selectedMonth !== 'ALL'
                ? 'Tidak ada catatan dengan filter periode ini.'
                : 'Lakukan presensi dan isi logbook harian untuk melihat riwayat.'}
            </p>
          </div>
        )}

        {/* 5. Tombol Paginasi "Tampilkan Lebih Banyak" */}
        {filteredHistory.length > visibleLimit && (
          <button
            type="button"
            onClick={() => setVisibleLimit(prev => prev + 15)}
            className="w-full py-2.5 mt-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span>Tampilkan 15 Hari Sebelumnya ({filteredHistory.length - visibleLimit} hari tersisa)</span>
            <ChevronDown size={14} />
          </button>
        )}
      </div>
    </div>
  );
});
