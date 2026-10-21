import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  ArrowUp, 
  ArrowDown, 
  ArrowUpDown, 
  Clock, 
  DoorOpen 
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getTeacherStatusMeta } from '@/utils/kbm-normalizer';
import { 
  GuruProduktifItem, 
  ResolvedJurusan, 
  GuruStatusFilter 
} from '../types';

type SortField = 'nama' | 'mapel' | 'jam' | 'ruang' | 'status';
type SortDirection = 'asc' | 'desc';

interface KaprogGuruTabProps {
  guruProduktifList: GuruProduktifItem[];
  resolvedJurusan?: ResolvedJurusan | null;
  onSelectGuru: (guru: GuruProduktifItem) => void;
}

export const KaprogGuruTab: React.FC<KaprogGuruTabProps> = React.memo(({
  guruProduktifList = [],
  resolvedJurusan,
  onSelectGuru,
}) => {
  const navigate = useNavigate();

  // State Filter Status: All, Hadir, Belum Masuk
  const [statusFilter, setStatusFilter] = useState<GuruStatusFilter>('ALL');

  // State Sorting Header Terintegrasi (Tanpa Tombol Khusus)
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Handler Sort Kolom Header
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Render Ikon Sort Header
  const renderSortIcon = useCallback((field: SortField) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? (
        <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
      );
    }
    return (
      <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
    );
  }, [sortField, sortDirection]);

  // Helper untuk parsing penyajian 2 baris (Baris 1: Waktu, Baris 2: Jumlah JP)
  const getScheduleDisplay = useCallback((guru: GuruProduktifItem) => {
    let timeStr = guru.waktuRentang || '';
    if (!timeStr) {
      const timeMatch = (guru.jamHariIni || '').match(/(\d{2}[:.]\d{2}\s*-\s*\d{2}[:.]\d{2}\s*WIB)/i);
      timeStr = timeMatch
        ? timeMatch[1].replace(/\./g, ':')
        : (guru.jamHariIni || '').replace(/\s*\([^)]*\)/g, '').replace(/Aktif|Selesai/gi, '').trim();
    }

    const jpCount = guru.totalJp || (() => {
      const match = (guru.jamHariIni || '').match(/(\d+)\s*JP/i);
      return match ? Number(match[1]) : 1;
    })();

    const isLive = guru.sessionStatus === 'BERLANGSUNG' || (guru.jamHariIni || '').toLowerCase().includes('aktif');

    return {
      timeStr: timeStr || guru.jamHariIni || '07:15 - 09:35 WIB',
      jpCount,
      isLive,
    };
  }, []);

  // Hitung jumlah guru untuk 3 filter pills: All, Hadir, Belum Masuk
  const counts = useMemo(() => {
    let belumMasuk = 0;
    let hadir = 0;

    (guruProduktifList || [])?.forEach((g) => {
      const st = (g.status || '').toUpperCase();
      if (st === 'BELUM_MASUK' || st === 'BELUM_TAP' || st === 'BELUM_HADIR') {
        belumMasuk++;
      } else if (st === 'HADIR' || st === 'TEPAT_WAKTU') {
        hadir++;
      }
    });

    return {
      all: (guruProduktifList || []).length,
      hadir,
      belumMasuk,
    };
  }, [guruProduktifList]);

  // Filter & Sort Pipeline
  const displayedGuruList = useMemo(() => {
    let list = [...(guruProduktifList || [])];

    // 1. Filter Status: All, Hadir, Belum Masuk
    if (statusFilter === 'HADIR') {
      list = list.filter((g) => {
        const st = (g.status || '').toUpperCase();
        return st === 'HADIR' || st === 'TEPAT_WAKTU';
      });
    } else if (statusFilter === 'BELUM_MASUK') {
      list = list.filter((g) => {
        const st = (g.status || '').toUpperCase();
        return st === 'BELUM_MASUK' || st === 'BELUM_TAP' || st === 'BELUM_HADIR';
      });
    }

    // 2. Sorting Engine Berdasarkan Header Aktif
    const statusWeight: Record<string, number> = {
      BELUM_MASUK: 1,
      BELUM_TAP: 1,
      INVAL: 2,
      TERLAMBAT: 3,
      HADIR: 4,
      TEPAT_WAKTU: 4,
      IZIN: 5,
      SAKIT: 5,
      DINAS_LUAR: 5,
      BELUM_MULAI: 6,
    };

    list.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'status') {
        const wA = statusWeight[a.status] || 99;
        const wB = statusWeight[b.status] || 99;
        if (wA !== wB) {
          comparison = wA - wB;
        } else {
          const jamA = a.rawJamMulai || '07:00';
          const jamB = b.rawJamMulai || '07:00';
          comparison = jamA.localeCompare(jamB);
        }
      } else if (sortField === 'jam') {
        const jamA = a.rawJamMulai || '99:99';
        const jamB = b.rawJamMulai || '99:99';
        comparison = jamA.localeCompare(jamB);
      } else if (sortField === 'nama') {
        comparison = a.nama.localeCompare(b.nama);
      } else if (sortField === 'ruang') {
        const rA = a.ruang || 'ZZZ';
        const rB = b.ruang || 'ZZZ';
        comparison = rA.localeCompare(rB);
      } else if (sortField === 'mapel') {
        comparison = a.mapel.localeCompare(b.mapel);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [guruProduktifList, statusFilter, sortField, sortDirection]);

  return (
    <div className="space-y-5">
      <Card noPadding className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 space-y-4">
        {/* Header Modul Bersih */}
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Daftar Guru Produktif Jurusan {resolvedJurusan?.singkatan || ''}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Supervisi status kehadiran sesi KBM hari ini, penugasan praktik, dan kontak cepat.
          </p>
        </div>

        {/* Baris Filter Pills: All, Hadir, Belum Masuk */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border',
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            )}
          >
            All ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('HADIR')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border flex items-center gap-1.5',
              statusFilter === 'HADIR'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Hadir ({counts.hadir})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('BELUM_MASUK')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border flex items-center gap-1.5',
              statusFilter === 'BELUM_MASUK'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>Belum Masuk ({counts.belumMasuk})</span>
          </button>
        </div>

        {/* State Kosong */}
        {(guruProduktifList || [])?.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Belum Ada Data Guru Mengajar
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Tidak ada sesi KBM atau jadwal mengajar guru produktif yang terdaftar untuk jurusan {resolvedJurusan?.nama || 'ini'}.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/academic/jadwal')}
              className="text-xs font-semibold rounded-xl"
            >
              Lihat Jadwal KBM Sekolah
            </Button>
          </div>
        ) : displayedGuruList.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Tidak ada guru pada filter status ini.
          </div>
        ) : (
          <>
            {/* Mobile Card List (< sm) */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 block sm:hidden">
              {(displayedGuruList || [])?.map((guru) => {
                const meta = getTeacherStatusMeta(guru.status);
                const sch = getScheduleDisplay(guru);

                return (
                  <div key={guru.id} className="py-3.5 space-y-2 first:pt-1 last:pb-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {guru.nama}
                        </h4>
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate">
                          {guru.mapel}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className={cn('whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border', meta.badgeClass)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', meta.dotClass)} />
                          <span>{meta.titleCaseLabel}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectGuru(guru)}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Detail
                        </button>
                      </div>
                    </div>

                    {/* Penyajian 2 Baris di Mobile: Baris 1 Waktu, Baris 2 JP + Ruang */}
                    <div className="flex items-start justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <div className="space-y-1">
                        {/* Baris 1: Waktu */}
                        <div className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{sch.timeStr}</span>
                        </div>
                        {/* Baris 2: Jumlah JP */}
                        <div>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                            {sch.jpCount} JP
                          </span>
                        </div>
                      </div>

                      <span className="truncate max-w-[130px] flex items-center gap-1 pt-0.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        <DoorOpen className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{guru.ruang || '-'}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= sm): Header Terintegrasi dengan Sorting */}
            <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200/70 dark:border-slate-800">
                  <tr>
                    {/* Kolom 1: Nama Pendidik */}
                    <th 
                      onClick={() => handleSort('nama')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition-colors select-none group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Nama Pendidik</span>
                        {renderSortIcon('nama')}
                      </div>
                    </th>

                    {/* Kolom 2: Mata Pelajaran Produktif */}
                    <th 
                      onClick={() => handleSort('mapel')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition-colors select-none group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Mata Pelajaran Produktif</span>
                        {renderSortIcon('mapel')}
                      </div>
                    </th>

                    {/* Kolom 3: Jadwal Hari Ini */}
                    <th 
                      onClick={() => handleSort('jam')}
                      className="py-3 px-4 min-w-[180px] whitespace-nowrap cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition-colors select-none group"
                    >
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span>Jadwal Hari Ini</span>
                        {renderSortIcon('jam')}
                      </div>
                    </th>

                    {/* Kolom 4: Ruang / Lab */}
                    <th 
                      onClick={() => handleSort('ruang')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition-colors select-none group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Ruang / Lab</span>
                        {renderSortIcon('ruang')}
                      </div>
                    </th>

                    {/* Kolom 5: Status Kehadiran */}
                    <th 
                      onClick={() => handleSort('status')}
                      className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition-colors select-none group"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Status Kehadiran</span>
                        {renderSortIcon('status')}
                      </div>
                    </th>

                    {/* Kolom 6: Aksi */}
                    <th className="py-3 px-4 text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(displayedGuruList || [])?.map((guru) => {
                    const meta = getTeacherStatusMeta(guru.status);
                    const sch = getScheduleDisplay(guru);

                    return (
                      <tr key={guru.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">
                            {guru.nama}
                          </div>
                          {guru.nip && (
                            <div className="text-[10px] text-slate-400 font-mono">{guru.nip}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {guru.mapel}
                        </td>

                        {/* Kolom Jadwal Hari Ini: Dibuat 2 Baris (Baris 1: Waktu, Baris 2: Jumlah JP) */}
                        <td className="py-3 px-4 min-w-[180px] whitespace-nowrap">
                          <div className="space-y-1">
                            {/* Baris 1: Waktu (No wrap) */}
                            <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {sch.timeStr}
                            </div>
                            {/* Baris 2: Jumlah JP */}
                            <div>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                                {sch.jpCount} JP
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                          {guru.ruang || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={cn('whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border shadow-2xs', meta.badgeClass)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', meta.dotClass)} />
                            <span>{meta.titleCaseLabel}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectGuru(guru)}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
});

KaprogGuruTab.displayName = 'KaprogGuruTab';
