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
  ArrowRight,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import useConfirm from '@/hooks/useConfirm';
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
  onProceedToNextPhase?: () => void;
}

export const CbtPengawasMatrixPanel: React.FC<CbtPengawasMatrixPanelProps> = ({
  jadwalList,
  guruList,
  isLoadingJadwal,
  onProceedToNextPhase,
}) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyUnplotted, setOnlyUnplotted] = useState(false);
  const [selectedJadwalForPrint, setSelectedJadwalForPrint] = useState<CbtJadwalUjian | null>(null);

  const guruMap = useMemo(() => new Map((guruList || []).map((g) => [g.id, g])), [guruList]);

  // Pisahkan kelompok Pendidik (Guru) vs Tenaga Kependidikan (TU/Staf)
  const { pendidikList, tenagaKependidikanList } = useMemo(() => {
    const pendidik: any[] = [];
    const tu: any[] = [];

    (guruList || []).forEach((g) => {
      const ptk = (g.jenis_ptk || '').toUpperCase().trim();
      if (
        ptk === 'TENAGA_KEPENDIDIKAN' ||
        ptk === 'TU' ||
        ptk === 'TATA_USAHA' ||
        ptk === 'STAFF' ||
        ptk === 'STAF'
      ) {
        tu.push(g);
      } else {
        pendidik.push(g);
      }
    });

    return { pendidikList: pendidik, tenagaKependidikanList: tu };
  }, [guruList]);

  // List Pengawas Dikelompokkan (Optgroup: Pendidik vs Tenaga Kependidikan)
  const pengawasSelectOptions = useMemo(() => {
    const options: any[] = [
      { value: '', label: '— Belum Diploting —' },
    ];

    if (pendidikList.length > 0) {
      options.push({
        value: '__HEADER_PENDIDIK__',
        label: `🎓 GURU PENDIDIK (${pendidikList.length})`,
        isGroupHeader: true,
        disabled: true,
      });

      pendidikList.forEach((g) => {
        options.push({
          value: g.id,
          label: `${g.nama_guru}${g.nip ? ` (NIP. ${g.nip})` : ''}`,
          rightBadge: 'PENDIDIK',
          rightBadgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800',
          statusDotClass: 'bg-indigo-500',
        });
      });
    }

    if (tenagaKependidikanList.length > 0) {
      options.push({
        value: '__HEADER_TU__',
        label: `🏢 TENAGA KEPENDIDIKAN / TU (${tenagaKependidikanList.length})`,
        isGroupHeader: true,
        disabled: true,
      });

      tenagaKependidikanList.forEach((g) => {
        options.push({
          value: g.id,
          label: `${g.nama_guru}${g.nip ? ` (NIP. ${g.nip})` : ''}`,
          rightBadge: 'STAF TU',
          rightBadgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800',
          statusDotClass: 'bg-amber-500',
        });
      });
    }

    return options;
  }, [pendidikList, tenagaKependidikanList]);

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

  const confirm = useConfirm();

  // Total Sesi yang Sudah Terplot Pengawas atau Proktor
  const totalPlottedCount = useMemo(() => {
    return jadwalList.filter((j) => {
      const draft = plottingDrafts[j.id];
      return !!(
        draft?.pengawas_1_id ||
        j.setting_keamanan?.pengawas_1_id ||
        draft?.proktor_id ||
        j.setting_keamanan?.proktor_id
      );
    }).length;
  }, [jadwalList, plottingDrafts]);

  // Anti-Conflict Auto-Distribute (Prioritize Pendidik Only; TU can be chosen manually)
  const handleAutoDistributeSupervisors = () => {
    const autoCandidates = pendidikList.length > 0 ? pendidikList : guruList;
    if (!autoCandidates.length) {
      toast.error('Data guru pendidik belum tersedia untuk distribusi otomatis');
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

      for (let attempt = 0; attempt < autoCandidates.length; attempt++) {
        const candidate = autoCandidates[(teacherCursor + attempt) % autoCandidates.length];
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
          teacherCursor = (teacherCursor + attempt + 1) % autoCandidates.length;
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

    if (assignedCount === 0) {
      toast('Seluruh sesi ujian sudah memiliki pengawas. Gunakan tombol "Kosongkan Ploting" jika ingin membagi ulang dari awal.', {
        icon: 'ℹ️',
      });
      return;
    }

    setPlottingDrafts(nextDrafts);
    toast.success(
      `Berhasil mendistribusikan ${assignedCount} sesi/ruang ke Guru Pendidik! (Staf TU tetap dapat dipilih secara manual)`
    );
  };

  const dirtyPlottingItems = useMemo(() => {
    return Object.values(plottingDrafts).filter((d) => d.dirty);
  }, [plottingDrafts]);

  // Clear All Plotted Supervisors & Proctors Mutation
  const clearPlottingMutation = useMutation({
    mutationFn: async () => {
      const payload = jadwalList.map((d) => {
        const curr = plottingDrafts[d.id];
        return {
          jadwal_id: d.id,
          ruang_ujian: (curr?.ruang_ujian || d.setting_keamanan?.ruang_ujian || '').trim(),
          pengawas_1_id: '',
          pengawas_1_nama: '',
          pengawas_1_nip: '',
          proktor_id: '',
          proktor_nama: '',
          proktor_nip: '',
          pengawas_2_id: '',
          pengawas_2_nama: '',
          pengawas_2_nip: '',
        };
      });
      return cbtApi.bulkUpdatePlotting(payload);
    },
    onSuccess: async () => {
      const resetDrafts: Record<string, PlottingDraftRow> = {};
      jadwalList.forEach((j) => {
        const curr = plottingDrafts[j.id];
        resetDrafts[j.id] = {
          jadwal_id: j.id,
          ruang_ujian: curr?.ruang_ujian || j.setting_keamanan?.ruang_ujian || '',
          pengawas_1_id: '',
          proktor_id: '',
          dirty: false,
        };
      });
      setPlottingDrafts(resetDrafts);
      toast.success('Seluruh hasil ploting pengawas & proktor berhasil dikosongkan!');
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mengosongkan ploting pengawas');
    },
  });

  const handleConfirmClearAllPlotting = async () => {
    if (totalPlottedCount === 0 && dirtyPlottingItems.length === 0) {
      toast('Belum ada hasil ploting yang terisi untuk dikosongkan.', { icon: 'ℹ️' });
      return;
    }

    const isConfirmed = await confirm({
      title: 'Kosongkan Hasil Ploting Pengawas?',
      message: `Tindakan ini akan menghapus penugasan Pengawas Ruang dan Proktor pada seluruh ${jadwalList.length} sesi ujian. Anda dapat melakukan ploting ulang kembali setelahnya.`,
      confirmText: 'Ya, Kosongkan Ploting',
      cancelText: 'Batal',
      style: 'danger',
    });

    if (isConfirmed) {
      clearPlottingMutation.mutate();
    }
  };

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
            disabled={totalPlottedCount === 0 || clearPlottingMutation.isPending}
            onClick={handleConfirmClearAllPlotting}
            className="text-xs h-9 px-3 font-bold text-rose-600 border-rose-200 bg-rose-50/50 hover:bg-rose-100 hover:border-rose-300 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 cursor-pointer disabled:opacity-40"
            title="Kosongkan seluruh pengawas & proktor yang sudah terplot"
          >
            <RotateCcw size={14} className={cn("mr-1.5", clearPlottingMutation.isPending && "animate-spin")} />
            <span>{clearPlottingMutation.isPending ? 'Mengosongkan...' : 'Kosongkan Ploting'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoDistributeSupervisors}
            className="text-xs h-9 px-3 font-bold text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100"
            title="Plot otomatis memprioritaskan Guru Pendidik tanpa bentrok jam. Kelompok Tenaga Kependidikan/TU tetap dapat dipilih secara manual."
          >
            <Wand2 size={14} className="mr-1.5" />
            <span>Plot Otomatis Guru (Anti-Bentrok)</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={dirtyPlottingItems.length === 0 || bulkPlottingMutation.isPending}
            onClick={() => bulkPlottingMutation.mutate()}
            className="text-xs h-9 px-4 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs cursor-pointer"
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
              <th className="p-3 w-20 text-center">Aksi</th>
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
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
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
                          className="w-full pl-7 pr-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300"
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
                        clearable={true}
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
                        clearable={true}
                      />
                    </td>

                    <td className="p-3 align-top text-center">
                      <div className="flex items-center justify-center gap-1">
                        {(draft.pengawas_1_id || draft.proktor_id) && (
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdatePlotRow(row.id, 'pengawas_1_id', '');
                              handleUpdatePlotRow(row.id, 'proktor_id', '');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                            title="Kosongkan pengawas untuk sesi ini"
                            aria-label={`Kosongkan pengawas ${row.nama_sesi}`}
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedJadwalForPrint(row)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                          title="Pratinjau & Cetak Berita Acara Ruang Ujian"
                          aria-label="Cetak Berita Acara Ruang"
                        >
                          <Printer size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Navigasi Antar-Fase */}
      {onProceedToNextPhase && (
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Setelah pengawas terplot dan tersimpan, Anda siap memantau jalannya ujian secara langsung di Fase 5.
          </p>
          <Button
            type="button"
            variant="primary"
            onClick={onProceedToNextPhase}
            className="flex items-center gap-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 text-xs px-4 py-2 shadow-2xs"
          >
            <span>Lanjut ke Fase 5: Hari H &amp; Live Proctoring</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      )}

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
