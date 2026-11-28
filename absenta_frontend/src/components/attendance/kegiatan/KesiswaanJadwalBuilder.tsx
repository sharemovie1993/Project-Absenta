import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Shield,
  Layers,
  Sunrise,
  Sun,
  Sunset,
  Sparkles,
  Users,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import type { JadwalKegiatanItem } from '@/api/attendance/jadwalKegiatan.api';
import { HARI_LIST as HARI_OPTION, WORKDAYS_HARI_KEYS as WORKDAYS } from '@/constants/day.constants';
import { cn } from '@/lib/utils';

export interface KesiswaanJadwalBuilderProps {
  jadwalItems: JadwalKegiatanItem[];
  classes: any[];
  readOnly?: boolean;
  variant?: 'full' | 'compact';
  onEditItem: (item: JadwalKegiatanItem, targetDay?: string) => void;
  onDeleteItem: (id: string, nama: string) => void;
  onAddNewToDay: (day: string) => void;
}

const parseArray = (field: unknown): string[] => {
  if (!field) return [];
  if (Array.isArray(field)) return field.map(String) || [];
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) return parsed.map(String) || [];
    } catch {}
    return field.split(',').map((s: string) => s.trim()).filter(Boolean) || [];
  }
  return [];
};

function calculateDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return '';
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (hours > 0 && minutes > 0) return `${hours}j ${minutes}m`;
  if (hours > 0) return `${hours} jam`;
  if (minutes > 0) return `${minutes} mnt`;
  return '';
}

function getTimeBucket(startStr?: string): 'PAGI' | 'SIANG' | 'SORE' {
  if (!startStr) return 'PAGI';
  const hour = parseInt(startStr.split(':')[0], 10);
  if (isNaN(hour)) return 'PAGI';
  if (hour < 11) return 'PAGI';
  if (hour < 15) return 'SIANG';
  return 'SORE';
}

export const KesiswaanJadwalBuilder: React.FC<KesiswaanJadwalBuilderProps> = React.memo(({
  jadwalItems,
  classes,
  readOnly = false,
  variant = 'full',
  onEditItem,
  onDeleteItem,
  onAddNewToDay,
}) => {
  const isCompact = variant === 'compact';
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'PEMBIASAAN' | 'ESKUL'>('ALL');

  // Days order: SENIN to SABTU (and MINGGU if any scheduled)
  const daysList = useMemo(() => {
    const hasSunday = jadwalItems.some(j => parseArray(j.hari).includes('MINGGU'));
    return hasSunday ? [...WORKDAYS, 'MINGGU'] : WORKDAYS;
  }, [jadwalItems]);

  // Group schedules by day
  const schedulesByDay = useMemo(() => {
    const map: Record<string, JadwalKegiatanItem[]> = {};
    daysList.forEach(d => { map[d] = []; });

    jadwalItems.forEach(item => {
      if (filterCategory !== 'ALL') {
        const isEskul = item.jenis_kegiatan === 'ESKUL';
        if (filterCategory === 'ESKUL' && !isEskul) return;
        if (filterCategory === 'PEMBIASAAN' && isEskul) return;
      }

      const itemDays = parseArray(item.hari);
      itemDays.forEach(day => {
        const upperDay = day.toUpperCase();
        if (map[upperDay]) {
          map[upperDay].push(item);
        }
      });
    });

    // Sort each day chronologically by waktu_mulai
    Object.keys(map).forEach(day => {
      map[day].sort((a, b) => (a.waktu_mulai || '').localeCompare(b.waktu_mulai || ''));
    });

    return map;
  }, [jadwalItems, daysList, filterCategory]);

  // Weekly Stats calculation
  const stats = useMemo(() => {
    let totalSchedules = 0;
    let totalMinutes = 0;
    let pembiasaanCount = 0;
    let eskulCount = 0;

    jadwalItems.forEach(item => {
      const daysCount = parseArray(item.hari).length;
      totalSchedules += daysCount;
      if (item.jenis_kegiatan === 'ESKUL') {
        eskulCount += 1;
      } else {
        pembiasaanCount += 1;
      }

      if (item.waktu_mulai && item.waktu_selesai) {
        const [sh, sm] = item.waktu_mulai.split(':').map(Number);
        const [eh, em] = item.waktu_selesai.split(':').map(Number);
        if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
          let diff = (eh * 60 + em) - (sh * 60 + sm);
          if (diff < 0) diff += 24 * 60;
          totalMinutes += diff * daysCount;
        }
      }
    });

    const totalHours = (totalMinutes / 60).toFixed(1);
    return { totalSchedules, totalHours, pembiasaanCount, eskulCount };
  }, [jadwalItems]);

  return (
    <div className={cn('w-full min-w-0', isCompact ? 'space-y-2.5' : 'space-y-4')}>
      {/* Top Controls & Category Filter (hanya pada mode full) */}
      {!isCompact && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>Jadwal Builder Kesiswaan (Timetable Mingguan)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Visual Grid
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kelola dan pantau seluruh agenda pembiasaan, ketarunaan, dan eskul sekolah dalam grid interaktif Senin–Sabtu.
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFilterCategory('ALL')}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                  filterCategory === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                Semua ({jadwalItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('PEMBIASAAN')}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                  filterCategory === 'PEMBIASAAN'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                Pembiasaan &amp; Ketarunaan
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('ESKUL')}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                  filterCategory === 'ESKUL'
                    ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                Ekstrakurikuler
              </button>
            </div>
          </div>

          {/* Weekly Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <Clock size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Jam / Minggu</span>
                <span className="text-base font-black text-slate-800 dark:text-slate-100">{stats.totalHours} Jam</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <Shield size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Agenda Pembiasaan</span>
                <span className="text-base font-black text-slate-800 dark:text-slate-100">{stats.pembiasaanCount} Kegiatan</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400">
                <Sparkles size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ekstrakurikuler</span>
                <span className="text-base font-black text-slate-800 dark:text-slate-100">{stats.eskulCount} Eskul</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <Users size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Slot Sesi / Mg</span>
                <span className="text-base font-black text-slate-800 dark:text-slate-100">{stats.totalSchedules} Sesi</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Weekly Timetable Grid */}
      <div className={cn(
        'grid items-start',
        isCompact
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5'
      )}>
        {daysList.map((dayKey) => {
          const opt = HARI_OPTION.find(o => o.value === dayKey);
          const dayLabel = opt?.label || dayKey;
          const isSabtu = dayKey === 'SABTU';
          const items = schedulesByDay[dayKey] || [];

          return (
            <div
              key={dayKey}
              className={cn(
                'flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden bg-slate-50/60 dark:bg-slate-900/40',
                isSabtu
                  ? 'border-amber-300/80 dark:border-amber-900/60 ring-1 ring-amber-400/20'
                  : 'border-slate-200 dark:border-slate-800'
              )}
            >
              {/* Day Header */}
              <div
                className={cn(
                  'border-b flex items-center justify-between',
                  isCompact ? 'px-2.5 py-2' : 'p-3',
                  isSabtu
                    ? 'bg-amber-100/70 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100'
                )}
              >
                <div className={cn(isCompact && 'flex items-center justify-between w-full gap-1')}>
                  <span className="text-[11px] font-black uppercase tracking-wider block">
                    {dayLabel}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                    {isCompact ? `${items.length}` : `${items.length} Kegiatan Terjadwal`}
                  </span>
                </div>
                {!isCompact && isSabtu && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                    Lapangan
                  </span>
                )}
              </div>

              {/* Day Timeline Body */}
              <div className={cn(
                'flex flex-col justify-between',
                isCompact ? 'p-2 space-y-1.5 min-h-[120px]' : 'p-2.5 space-y-2.5 min-h-[220px]'
              )}>
                <div className={cn(isCompact ? 'space-y-1.5' : 'space-y-2')}>
                  {items.length === 0 ? (
                    <div className={cn('text-center text-slate-400 dark:text-slate-500', isCompact ? 'py-4 px-1' : 'py-8 px-2')}>
                      {!isCompact && <Calendar className="w-6 h-6 mx-auto mb-1.5 opacity-40" />}
                      <span className="text-[10px] font-medium block">Kosong</span>
                    </div>
                  ) : (
                    items.map((item) => {
                      const isKetarunaan = (item.nama || '').toLowerCase().includes('ketarunaan');
                      const isEskul = item.jenis_kegiatan === 'ESKUL';
                      const isUpacara = (item.nama || '').toLowerCase().includes('upacara');
                      const isDhuha = /duha|dhuha|rohis/i.test(`${item.nama || ''} ${item.jenis_kegiatan || ''}`);
                      const bucket = getTimeBucket(item.waktu_mulai);
                      const dur = calculateDuration(item.waktu_mulai, item.waktu_selesai);

                      if (isCompact) {
                        return (
                          <div
                            key={`${dayKey}-${item.id}`}
                            onClick={() => !readOnly && onEditItem(item, dayKey)}
                            className={cn(
                              'px-2.5 py-2 rounded-xl border transition-all text-left group relative',
                              !readOnly && 'cursor-pointer hover:shadow-xs',
                              isKetarunaan
                                ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/90 dark:border-blue-900/50 hover:border-blue-400'
                                : isDhuha
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/90 dark:border-emerald-900/50 hover:border-emerald-400'
                                : isUpacara
                                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/90 dark:border-amber-900/50 hover:border-amber-400'
                                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-400'
                            )}
                          >
                            <h4 className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 line-clamp-1 leading-tight pr-4">
                              {item.nama}
                            </h4>
                            <p className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                              <Clock size={9} className="shrink-0 opacity-70" />
                              <span>{item.waktu_mulai}–{item.waktu_selesai || 'Selesai'}</span>
                            </p>

                            {!readOnly && (
                              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white/95 dark:bg-slate-900/95 p-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                                <button
                                  type="button"
                                  title="Edit Jadwal"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditItem(item, dayKey);
                                  }}
                                  className="p-0.5 rounded text-slate-500 hover:text-indigo-600 cursor-pointer"
                                >
                                  <Edit3 size={10} />
                                </button>
                                <button
                                  type="button"
                                  title="Hapus Jadwal"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteItem(item.id, item.nama);
                                  }}
                                  className="p-0.5 rounded text-slate-500 hover:text-rose-600 cursor-pointer"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`${dayKey}-${item.id}`}
                          onClick={() => !readOnly && onEditItem(item, dayKey)}
                          className={cn(
                            'p-3 rounded-xl border transition-all text-left group cursor-pointer relative shadow-xs hover:shadow-md hover:scale-[1.01]',
                            isKetarunaan
                              ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 hover:border-blue-400'
                              : isEskul
                              ? 'bg-violet-50/70 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900/50 hover:border-violet-400'
                              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-400'
                          )}
                        >
                          {/* Time & Bucket Header */}
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1 text-slate-500">
                              {bucket === 'PAGI' && <Sunrise size={11} className="text-amber-500" />}
                              {bucket === 'SIANG' && <Sun size={11} className="text-orange-500" />}
                              {bucket === 'SORE' && <Sunset size={11} className="text-indigo-500" />}
                              <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                                {item.waktu_mulai} – {item.waktu_selesai || 'Selesai'}
                              </span>
                            </div>
                            {dur && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {dur}
                              </span>
                            )}
                          </div>

                          {/* Activity Name */}
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 line-clamp-1 leading-snug">
                            {item.nama}
                          </h4>

                          {/* Target Class Pill */}
                          <div className="mt-1 flex items-center justify-between gap-1">
                            <span className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                              {item.target_semua_kelas
                                ? 'Seluruh Kelas'
                                : `${parseArray(item.target_kelas_ids).length} Rombel`}
                            </span>
                            <span
                              className={cn(
                                'text-[8.5px] font-black px-1.5 py-0.2 rounded-sm uppercase tracking-wider',
                                isKetarunaan
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : isEskul
                                  ? 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              )}
                            >
                              {item.jenis_kegiatan}
                            </span>
                          </div>

                          {/* Hover Action Buttons */}
                          {!readOnly && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-sm">
                              <button
                                type="button"
                                title="Edit Jadwal"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditItem(item, dayKey);
                                }}
                                className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Edit3 size={11} />
                              </button>
                              <button
                                type="button"
                                title="Hapus Jadwal"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteItem(item.id, item.nama);
                                }}
                                className="p-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick Add Button on this Day */}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onAddNewToDay(dayKey)}
                    className={cn(
                      'w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-bold flex items-center justify-center gap-1 cursor-pointer',
                      isCompact ? 'py-1.5 px-2 text-[10px] mt-1.5' : 'py-2 px-2.5 text-[11px] mt-2'
                    )}
                  >
                    <Plus size={isCompact ? 11 : 12} />
                    <span>{isCompact ? 'Tambah' : `Tambah di ${dayLabel}`}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default KesiswaanJadwalBuilder;
