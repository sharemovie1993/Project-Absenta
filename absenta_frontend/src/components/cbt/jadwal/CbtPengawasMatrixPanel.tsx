import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, Button, SearchableSelect, Badge } from '@/components/ui';
import {
  Users,
  Wand2,
  Save,
  Search,
  AlertTriangle,
  Clock,
  MapPin,
  Printer,
  FileCheck2,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtJadwalUjian } from '@/types/cbt.types';
import {
  formatLocalTimeFromISO,
  getTimezone,
  getTimezoneLabel,
} from '@/utils/attendance/time';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { CbtBeritaAcaraPrintModal } from './CbtBeritaAcaraPrintModal';

interface PlottingDraftRow {
  jadwal_id: string;
  ruang_ujian: string;
  pengawas_1_id: string;
  proktor_id: string;
  dirty: boolean;
}

interface CbtPengawasMatrixPanelProps {
  jadwalList: CbtJadwalUjian[];
  guruList: any[];
  isLoadingJadwal: boolean;
}

export const CbtPengawasMatrixPanel: React.FC<CbtPengawasMatrixPanelProps> = ({
  jadwalList,
  guruList,
  isLoadingJadwal,
}) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyUnplotted, setOnlyUnplotted] = useState(false);
  const [selectedJadwalForPrint, setSelectedJadwalForPrint] = useState<CbtJadwalUjian | null>(null);

  const guruMap = useMemo(() => new Map((guruList || []).map((g) => [g.id, g])), [guruList]);

  const pengawasSelectOptions = useMemo(() => {
    return [
      { value: '', label: '— Belum Diploting —' },
      ...(guruList || []).map((g) => ({
        value: g.id,
        label: `${g.nama_guru}${g.nip ? ` (NIP. ${g.nip})` : ''}`,
      })),
    ];
  }, [guruList]);

  // Local draft state for Plotting
  const [plottingDrafts, setPlottingDrafts] = useState<Record<string, PlottingDraftRow>>({});

  useEffect(() => {
    if (!jadwalList.length) return;
    setPlottingDrafts((prev) => {
      const next: Record<string, PlottingDraftRow> = {};
      jadwalList.forEach((j) => {
        const existing = prev[j.id];
        if (existing?.dirty) {
          next[j.id] = existing;
        } else {
          next[j.id] = {
            jadwal_id: j.id,
            ruang_ujian: j.setting_keamanan?.ruang_ujian || '',
            pengawas_1_id: j.setting_keamanan?.pengawas_1_id || '',
            proktor_id: j.setting_keamanan?.proktor_id || j.setting_keamanan?.pengawas_2_id || '',
            dirty: false,
          };
        }
      });
      return next;
    });
  }, [jadwalList]);

  const handleUpdatePlotRow = useCallback(
    (jadwalId: string, field: 'ruang_ujian' | 'pengawas_1_id' | 'proktor_id', value: string) => {
      setPlottingDrafts((prev) => {
        const curr = prev[jadwalId] || {
          jadwal_id: jadwalId,
          ruang_ujian: '',
          pengawas_1_id: '',
          proktor_id: '',
          dirty: false,
        };
        return {
          ...prev,
          [jadwalId]: {
            ...curr,
            [field]: value,
            dirty: true,
          },
        };
      });
    },
    []
  );

  // Overlapping supervisor conflict detection
  const conflictJadwalIds = useMemo(() => {
    const conflicts = new Set<string>();
    for (let i = 0; i < jadwalList.length; i++) {
      const a = jadwalList[i];
      const draftA = plottingDrafts[a.id];
      const pA = draftA?.pengawas_1_id;
      if (!pA) continue;

      const startA = new Date(a.tanggal_mulai).getTime();
      const endA = new Date(a.tanggal_selesai).getTime();

      for (let k = i + 1; k < jadwalList.length; k++) {
        const b = jadwalList[k];
        const draftB = plottingDrafts[b.id];
        const pB = draftB?.pengawas_1_id;
        if (!pB || pA !== pB) continue;

        const startB = new Date(b.tanggal_mulai).getTime();
        const endB = new Date(b.tanggal_selesai).getTime();

        if (startA < endB && startB < endA) {
          conflicts.add(a.id);
          conflicts.add(b.id);
        }
      }
    }
    return conflicts;
  }, [jadwalList, plottingDrafts]);

  // Anti-Conflict Auto-Distribute
  const handleAutoDistributeSupervisors = () => {
    if (!guruList.length) {
      toast.error('Data guru belum tersedia untuk distribusi otomatis');
      return;
    }

    const nextDrafts = { ...plottingDrafts };
    let assignedCount = 0;
    let teacherCursor = 0;

    jadwalList.forEach((jadwal) => {
      const curr = nextDrafts[jadwal.id];
      if (!curr) return;

      const needsSupervisor = !curr.pengawas_1_id;
      if (!needsSupervisor) return;

      const startJ = new Date(jadwal.tanggal_mulai).getTime();
      const endJ = new Date(jadwal.tanggal_selesai).getTime();
      let chosenGuruId = curr.pengawas_1_id;

      for (let attempt = 0; attempt < guruList.length; attempt++) {
        const candidate = guruList[(teacherCursor + attempt) % guruList.length];
        const isBusy = jadwalList.some((other) => {
          if (other.id === jadwal.id) return false;
          const otherDraft = nextDrafts[other.id];
          if (otherDraft?.pengawas_1_id !== candidate.id && otherDraft?.proktor_id !== candidate.id) {
            return false;
          }
          const sO = new Date(other.tanggal_mulai).getTime();
          const eO = new Date(other.tanggal_selesai).getTime();
          return startJ < eO && sO < endJ;
        });

        if (!isBusy) {
          chosenGuruId = candidate.id;
          teacherCursor = (teacherCursor + attempt + 1) % guruList.length;
          break;
        }
      }

      nextDrafts[jadwal.id] = {
        ...curr,
        pengawas_1_id: chosenGuruId,
        dirty: true,
      };
      assignedCount++;
    });

    setPlottingDrafts(nextDrafts);
    toast.success(`Berhasil mendistribusikan pengawas otomatis pada ${assignedCount} sesi/ruang ujian!`);
  };

  const dirtyPlottingItems = useMemo(() => {
    return Object.values(plottingDrafts).filter((d) => d.dirty);
  }, [plottingDrafts]);

  const bulkPlottingMutation = useMutation({
    mutationFn: async () => {
      const payload = dirtyPlottingItems.map((d) => {
        const p1 = d.pengawas_1_id ? guruMap.get(d.pengawas_1_id) : undefined;
        const pr = d.proktor_id ? guruMap.get(d.proktor_id) : undefined;
        return {
          jadwal_id: d.jadwal_id,
          ruang_ujian: d.ruang_ujian.trim(),
          pengawas_1_id: d.pengawas_1_id || '',
          pengawas_1_nama: p1?.nama_guru || '',
          pengawas_1_nip: p1?.nip || '',
          proktor_id: d.proktor_id || '',
          proktor_nama: pr?.nama_guru || '',
          proktor_nip: pr?.nip || '',
          pengawas_2_id: d.proktor_id || '',
          pengawas_2_nama: pr?.nama_guru || '',
          pengawas_2_nip: pr?.nip || '',
        };
      });
      return cbtApi.bulkUpdatePlotting(payload);
    },
    onSuccess: async (res) => {
      toast.success(`Berhasil menyimpan ploting ${res?.updated_count || dirtyPlottingItems.length} jadwal ujian!`);
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menyimpan ploting pengawas massal');
    },
  });

  const filteredJadwalList = useMemo(() => {
    return jadwalList.filter((j) => {
      const draft = plottingDrafts[j.id];
      if (onlyUnplotted && draft?.pengawas_1_id) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchSesi = j.nama_sesi.toLowerCase().includes(q);
        const matchMapel = (j.BankSoal?.Mapel?.nama_mapel || j.BankSoal?.MataPelajaran?.nama_mapel || '')
          .toLowerCase()
          .includes(q);
        const matchRuang = (draft?.ruang_ujian || '').toLowerCase().includes(q);
        return matchSesi || matchMapel || matchRuang;
      }
      return true;
    });
  }, [jadwalList, plottingDrafts, onlyUnplotted, searchQuery]);

  const tz = getTimezone();
  const tzLabel = getTimezoneLabel(tz);

  return (
    <Card className="p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs space-y-4">
      {/* Toolbar Ploting Pengawas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap flex-1">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari sesi, mapel, atau ruang (R.01)..."
              aria-label="Cari jadwal untuk diploting"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
            />
          </div>

          <button
            type="button"
            onClick={() => setOnlyUnplotted((prev) => !prev)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
              onlyUnplotted
                ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300'
                : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-800'
            )}
          >
            Belum Ada Pengawas
          </button>

          {conflictJadwalIds.size > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
              <AlertTriangle size={13} />
              <span>{conflictJadwalIds.size} Sesi Bentrok Jam Pengawas!</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoDistributeSupervisors}
            className="text-xs h-9 px-3 font-bold text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100"
            title="Bagi otomatis guru pengawas ke jadwal/ruang yang masih kosong tanpa bentrok jam"
          >
            <Wand2 size={14} className="mr-1.5" />
            <span>Plot Otomatis (Anti-Bentrok)</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={dirtyPlottingItems.length === 0 || bulkPlottingMutation.isPending}
            onClick={() => bulkPlottingMutation.mutate()}
            className="text-xs h-9 px-4 font-bold bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Save size={14} className="mr-1.5" />
            <span>
              {bulkPlottingMutation.isPending
                ? 'Menyimpan...'
                : `Simpan Ploting (${dirtyPlottingItems.length})`}
            </span>
          </Button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="p-3 min-w-[200px]">Sesi &amp; Mata Pelajaran</th>
              <th className="p-3 min-w-[160px]">Waktu Pelaksanaan</th>
              <th className="p-3 min-w-[140px]">Ruang Ujian</th>
              <th className="p-3 min-w-[230px]">Pengawas Ruang 1 (Wajib)</th>
              <th className="p-3 min-w-[220px]">Proktor / Pengawas 2</th>
              <th className="p-3 w-14 text-center">Cetak</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
            {isLoadingJadwal ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Memuat daftar jadwal ujian...
                </td>
              </tr>
            ) : filteredJadwalList.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Tidak ada jadwal ujian yang sesuai filter.
                </td>
              </tr>
            ) : (
              filteredJadwalList.map((row) => {
                const draft = plottingDrafts[row.id] || {
                  jadwal_id: row.id,
                  ruang_ujian: '',
                  pengawas_1_id: '',
                  proktor_id: '',
                  dirty: false,
                };
                const isConflict = conflictJadwalIds.has(row.id);
                const tgl = new Date(row.tanggal_mulai);
                const jamMulai = formatLocalTimeFromISO(row.tanggal_mulai);
                const jamSelesai = formatLocalTimeFromISO(row.tanggal_selesai);
                const mapelName =
                  row.BankSoal?.Mapel?.nama_mapel ||
                  row.BankSoal?.MataPelajaran?.nama_mapel ||
                  'Mapel Umum';

                return (
                  <tr
                    key={row.id}
                    className={cn(
                      'transition-colors',
                      isConflict
                        ? 'bg-rose-50/50 dark:bg-rose-950/20'
                        : draft.dirty
                        ? 'bg-violet-50/40 dark:bg-violet-950/20'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    )}
                  >
                    <td className="p-3 align-top">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{row.nama_sesi}</div>
                      <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {mapelName} • Token: <span className="font-mono">{row.token_ujian}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Pengampu: {row.BankSoal?.Guru?.nama_guru || '-'}
                      </div>
                    </td>

                    <td className="p-3 align-top">
                      <div className="font-semibold text-slate-700 dark:text-slate-200">
                        {tgl.toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          timeZone: tz,
                        })}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock size={11} />
                        <span>
                          {jamMulai}–{jamSelesai} {tzLabel}
                        </span>
                      </div>
                    </td>

                    <td className="p-3 align-top">
                      <div className="relative">
                        <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={draft.ruang_ujian}
                          onChange={(e) => handleUpdatePlotRow(row.id, 'ruang_ujian', e.target.value)}
                          placeholder="R.01"
                          aria-label={`Ruang ujian untuk ${row.nama_sesi}`}
                          className="w-full pl-7 pr-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-violet-700"
                        />
                      </div>
                    </td>

                    <td className="p-3 align-top">
                      <SearchableSelect
                        options={pengawasSelectOptions}
                        value={draft.pengawas_1_id}
                        onChange={(val) => handleUpdatePlotRow(row.id, 'pengawas_1_id', val)}
                        placeholder="Pilih Pengawas Ruang..."
                        aria-label={`Pengawas ruang untuk ${row.nama_sesi}`}
                      />
                      {isConflict && (
                        <p className="text-[10px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                          <AlertTriangle size={11} />
                          <span>Bentrok jam dengan sesi lain!</span>
                        </p>
                      )}
                    </td>

                    <td className="p-3 align-top">
                      <SearchableSelect
                        options={pengawasSelectOptions}
                        value={draft.proktor_id}
                        onChange={(val) => handleUpdatePlotRow(row.id, 'proktor_id', val)}
                        placeholder="Opsional (Tanpa Proktor)..."
                        aria-label={`Proktor untuk ${row.nama_sesi}`}
                      />
                    </td>

                    <td className="p-3 align-top text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedJadwalForPrint(row)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors cursor-pointer"
                        title="Pratinjau & Cetak Berita Acara Ruang Ujian"
                        aria-label="Cetak Berita Acara Ruang"
                      >
                        <Printer size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Berita Acara */}
      {selectedJadwalForPrint && (
        <CbtBeritaAcaraPrintModal
          isOpen={Boolean(selectedJadwalForPrint)}
          onClose={() => setSelectedJadwalForPrint(null)}
          jadwal={selectedJadwalForPrint}
        />
      )}
    </Card>
  );
};
