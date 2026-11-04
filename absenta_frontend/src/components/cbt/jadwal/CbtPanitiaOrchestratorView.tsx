import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Input,
  Badge,
  SearchableSelect,
} from '@/components/ui';
import {
  useKelasOptions,
  useTahunPelajaranOptions,
  useSemesterOptions,
  useGuruOptions,
} from '@/components/common';
import {
  Users,
  CalendarPlus,
  Wand2,
  Save,
  Search,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Clock,
  Layers,
  CheckSquare,
  Square,
} from 'lucide-react';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtJadwalUjian, CbtBankSoal } from '@/types/cbt.types';
import {
  formatLocalTimeFromISO,
  getTimezone,
  getTimezoneLabel,
  getVirtualDate,
  localDateTimeInputToISO,
} from '@/utils/attendance/time';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface PlottingDraftRow {
  jadwal_id: string;
  ruang_ujian: string;
  pengawas_1_id: string;
  proktor_id: string;
  dirty: boolean;
}

interface BuilderDraftItem {
  bank_soal_id: string;
  selected: boolean;
  nama_sesi: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  durasi_menit: number;
  ruang_ujian: string;
  pengawas_1_id: string;
  proktor_id: string;
  target_kelas_ids: string[];
}

export const CbtPanitiaOrchestratorView: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeMode, setActiveMode] = useState<'plotting' | 'builder'>('plotting');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyUnplotted, setOnlyUnplotted] = useState(false);

  const { rawList: guruList = [] } = useGuruOptions({ jenisPtk: 'ALL' });
  const { rawList: kelasList = [] } = useKelasOptions();
  const { activeYear: activeTp } = useTahunPelajaranOptions();
  const { activeSemester } = useSemesterOptions();

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

  // ── 1. Fetch Existing Jadwal List (For Matrix Plotting) ──
  const { data: jadwalRes, isLoading: isLoadingJadwal } = useQuery({
    queryKey: cbtQueryKeys.jadwal({ limit: 100 }),
    queryFn: () => cbtApi.getJadwalList({ limit: 100 }),
  });

  const jadwalList: CbtJadwalUjian[] = jadwalRes?.items || [];

  // Local draft state for Matrix Plotting
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

  // Detect overlapping schedule conflicts for the same supervisor
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

  // Smart Auto-Distribution of Supervisors (Anti-Conflict)
  const handleAutoDistributeSupervisors = () => {
    if (!guruList.length) {
      toast.error('Data guru belum tersedia untuk distribusi otomatis');
      return;
    }

    const nextDrafts = { ...plottingDrafts };
    let assignedCount = 0;
    let teacherCursor = 0;

    jadwalList.forEach((jadwal, idx) => {
      const curr = nextDrafts[jadwal.id];
      if (!curr) return;

      const needsSupervisor = !curr.pengawas_1_id;
      const needsRoom = !curr.ruang_ujian.trim();

      if (!needsSupervisor && !needsRoom) return;

      const startJ = new Date(jadwal.tanggal_mulai).getTime();
      const endJ = new Date(jadwal.tanggal_selesai).getTime();

      let chosenGuruId = curr.pengawas_1_id;

      if (needsSupervisor) {
        for (let attempt = 0; attempt < guruList.length; attempt++) {
          const candidate = guruList[(teacherCursor + attempt) % guruList.length];
          // Check if candidate is busy in overlapping jadwal
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
      }

      nextDrafts[jadwal.id] = {
        ...curr,
        ruang_ujian: needsRoom ? `Ruang ${String(idx + 1).padStart(2, '0')}` : curr.ruang_ujian,
        pengawas_1_id: chosenGuruId,
        dirty: true,
      };
      assignedCount++;
    });

    setPlottingDrafts(nextDrafts);
    toast.success(`Berhasil mendistribusikan pengawas & ruang otomatis pada ${assignedCount} sesi ujian!`);
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

  // ── 2. Mode 2: Rangkai Jadwal Ujian Serentak dari Bank Soal (Bulk Builder) ──
  const { data: bankRes, isLoading: isLoadingBank } = useQuery({
    queryKey: cbtQueryKeys.bankSoal({ limit: 100 }),
    queryFn: () => cbtApi.getBankSoalList({ limit: 100 }),
  });

  const bankList: CbtBankSoal[] = useMemo(() => {
    return (bankRes?.items || []).filter((b) => (b.jumlah_soal || b._count?.Soal || 0) > 0);
  }, [bankRes]);

  const defaultTodayStr = useMemo(() => {
    const now = getVirtualDate();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [eventPrefix, setEventPrefix] = useState('SAS Ganjil');
  const [defaultDate, setDefaultDate] = useState(defaultTodayStr);
  const [defaultStartTime, setDefaultStartTime] = useState('07:30');
  const [defaultEndTime, setDefaultEndTime] = useState('09:00');
  const [defaultDurasi, setDefaultDurasi] = useState(90);
  const [builderRows, setBuilderRows] = useState<Record<string, BuilderDraftItem>>({});

  useEffect(() => {
    if (!bankList.length) return;
    setBuilderRows((prev) => {
      const next: Record<string, BuilderDraftItem> = {};
      bankList.forEach((b, idx) => {
        if (prev[b.id]) {
          next[b.id] = prev[b.id];
        } else {
          // Auto-match classes by tingkat
          const matchedKelasIds = kelasList
            .filter((k) => !b.tingkat || String(k.tingkat).toUpperCase() === String(b.tingkat).toUpperCase())
            .map((k) => k.id);

          next[b.id] = {
            bank_soal_id: b.id,
            selected: false,
            nama_sesi: `${eventPrefix} - ${b.Mapel?.nama_mapel || b.MataPelajaran?.nama_mapel || b.judul}`,
            tanggal: defaultDate,
            jam_mulai: defaultStartTime,
            jam_selesai: defaultEndTime,
            durasi_menit: b.alokasi_menit || defaultDurasi,
            ruang_ujian: `Ruang ${String(idx + 1).padStart(2, '0')}`,
            pengawas_1_id: b.guru_id || '',
            proktor_id: '',
            target_kelas_ids: matchedKelasIds.length > 0 ? matchedKelasIds : kelasList.slice(0, 1).map((k) => k.id),
          };
        }
      });
      return next;
    });
  }, [bankList, kelasList, eventPrefix, defaultDate, defaultStartTime, defaultEndTime, defaultDurasi]);

  const applyTemplateToSelectedBuilderRows = () => {
    setBuilderRows((prev) => {
      const next = { ...prev };
      bankList.forEach((b) => {
        const row = next[b.id];
        if (!row) return;
        next[b.id] = {
          ...row,
          nama_sesi: `${eventPrefix} - ${b.Mapel?.nama_mapel || b.MataPelajaran?.nama_mapel || b.judul}`,
          tanggal: defaultDate,
          jam_mulai: defaultStartTime,
          jam_selesai: defaultEndTime,
          durasi_menit: defaultDurasi,
        };
      });
      return next;
    });
    toast.success('Template waktu & nama event berhasil diterapkan ke seluruh baris!');
  };

  const selectedBuilderList = useMemo(() => {
    return Object.values(builderRows).filter((r) => r.selected);
  }, [builderRows]);

  const bulkCreateMutation = useMutation({
    mutationFn: async () => {
      if (!activeTp?.id || !activeSemester?.id) {
        throw new Error('Tahun Pelajaran atau Semester aktif tidak ditemukan');
      }
      const items = selectedBuilderList.map((r) => {
        const p1 = r.pengawas_1_id ? guruMap.get(r.pengawas_1_id) : undefined;
        const pr = r.proktor_id ? guruMap.get(r.proktor_id) : undefined;
        return {
          bank_soal_id: r.bank_soal_id,
          tahun_pelajaran_id: activeTp.id,
          semester_id: activeSemester.id,
          nama_sesi: r.nama_sesi.trim(),
          tanggal_mulai: localDateTimeInputToISO(`${r.tanggal}T${r.jam_mulai}`),
          tanggal_selesai: localDateTimeInputToISO(`${r.tanggal}T${r.jam_selesai}`),
          durasi_menit: Number(r.durasi_menit) || 90,
          toleransi_terlambat_menit: 15,
          target_kelas_ids: r.target_kelas_ids,
          setting_keamanan: {
            lock_device: true,
            block_tab_switch: true,
            max_violations: 3,
            shuffle_questions: true,
            shuffle_options: true,
            show_result_instant: false,
            auto_transfer_rapor: false,
            ruang_ujian: r.ruang_ujian.trim() || undefined,
            pengawas_1_id: r.pengawas_1_id || undefined,
            pengawas_1_nama: p1?.nama_guru || undefined,
            pengawas_1_nip: p1?.nip || undefined,
            proktor_id: r.proktor_id || undefined,
            proktor_nama: pr?.nama_guru || undefined,
            proktor_nip: pr?.nip || undefined,
          },
        };
      });
      return cbtApi.bulkCreateJadwal(items);
    },
    onSuccess: async (res) => {
      toast.success(`Berhasil merangkai & menerbitkan ${res?.created_count || selectedBuilderList.length} jadwal ujian serentak!`);
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
      setActiveMode('plotting');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menerbitkan jadwal ujian serentak');
    },
  });

  const tz = getTimezone();
  const tzLabel = getTimezoneLabel(tz);

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* Header Mode Switcher */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers size={17} className="text-violet-600" />
            <span>Meja Orkestrasi Jadwal &amp; Ploting Pengawas Ujian Serentak</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rangkai jadwal ujian lintas mata pelajaran dan distribusikan Guru Pengawas Ruang secara terpusat.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveMode('plotting')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              activeMode === 'plotting'
                ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <Users size={14} />
            <span>Matrix Ploting Pengawas ({jadwalList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('builder')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              activeMode === 'builder'
                ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <CalendarPlus size={14} />
            <span>Rangkai Jadwal Serentak</span>
          </button>
        </div>
      </div>

      {activeMode === 'plotting' ? (
        <Card className="p-4 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs space-y-4">
          {/* Toolbar Matrix Plotting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap flex-1">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari sesi, mapel, atau ruang..."
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
                title="Bagi otomatis guru pengawas ke jadwal yang masih kosong tanpa bentrok jam"
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
                  <th className="p-3 min-w-[150px]">Ruang / Kelas Ujian</th>
                  <th className="p-3 min-w-[230px]">Pengawas Ruang / Kelas (Wajib)</th>
                  <th className="p-3 min-w-[220px]">Proktor / Pengawas 2 (Opsional)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {isLoadingJadwal ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Memuat daftar jadwal ujian...
                    </td>
                  </tr>
                ) : filteredJadwalList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
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
                              placeholder="Misal: Ruang 01"
                              aria-label={`Ruang ujian untuk ${row.nama_sesi}`}
                              className="w-full pl-7 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Mode 2: Rangkai Jadwal Ujian Serentak dari Bank Soal */
        <Card className="p-4 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs space-y-4">
          {/* Template Parameter Serentak */}
          <div className="p-3.5 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/70 dark:border-violet-800/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-violet-800 dark:text-violet-300">
                  Template Parameter Ujian Serentak
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Atur nama kegiatan, tanggal, dan jam default lalu centang Bank Soal yang ingin dijadwalkan serentak.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyTemplateToSelectedBuilderRows}
                className="text-xs h-8 px-3 font-bold text-violet-700 border-violet-300 bg-white hover:bg-violet-50"
              >
                Terapkan Waktu ke Semua Baris
              </Button>
            </div>

            {/* Preset Cepat Nomenklatur Resmi Dinas */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-violet-950 dark:text-violet-200 uppercase tracking-wider">
                Pilih Nomenklatur Asesmen Resmi Dinas:
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: 'SAS Ganjil', desc: 'Sumatif Akhir Semester' },
                  { label: 'SAT Genap', desc: 'Sumatif Akhir Tahun' },
                  { label: 'STS Ganjil', desc: 'Sumatif Tengah Semester 1' },
                  { label: 'STS Genap', desc: 'Sumatif Tengah Semester 2' },
                  { label: 'PSAJ', desc: 'Penilaian Sumatif Akhir Jenjang (Kelulusan)' },
                  { label: 'Simulasi Asesmen', desc: 'Tryout / Persiapan ANBK' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setEventPrefix(item.label)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                      eventPrefix === item.label
                        ? "bg-violet-600 text-white border-violet-600 shadow-2xs"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-violet-300"
                    )}
                    title={item.desc}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Nama Event</label>
                <Input
                  value={eventPrefix}
                  onChange={(e) => setEventPrefix(e.target.value)}
                  placeholder="SAS Ganjil"
                  aria-label="Nama Event Ujian"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Tanggal Default</label>
                <Input
                  type="date"
                  value={defaultDate}
                  onChange={(e) => setDefaultDate(e.target.value)}
                  aria-label="Tanggal Ujian Default"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Jam Mulai</label>
                <Input
                  type="time"
                  value={defaultStartTime}
                  onChange={(e) => setDefaultStartTime(e.target.value)}
                  aria-label="Jam Mulai Default"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Jam Selesai</label>
                <Input
                  type="time"
                  value={defaultEndTime}
                  onChange={(e) => setDefaultEndTime(e.target.value)}
                  aria-label="Jam Selesai Default"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Durasi (Menit)</label>
                <Input
                  type="number"
                  value={defaultDurasi}
                  onChange={(e) => setDefaultDurasi(Number(e.target.value) || 90)}
                  aria-label="Durasi Default"
                />
              </div>
            </div>
          </div>

          {/* Action Bar Builder */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const allSelected = bankList.every((b) => builderRows[b.id]?.selected);
                  setBuilderRows((prev) => {
                    const next = { ...prev };
                    bankList.forEach((b) => {
                      if (next[b.id]) next[b.id] = { ...next[b.id], selected: !allSelected };
                    });
                    return next;
                  });
                }}
                className="text-xs h-8 px-3 font-bold"
              >
                Pilih / Batal Semua ({selectedBuilderList.length}/{bankList.length})
              </Button>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={selectedBuilderList.length === 0 || bulkCreateMutation.isPending}
              onClick={() => bulkCreateMutation.mutate()}
              className="text-xs h-9 px-4 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 size={14} className="mr-1.5" />
              <span>
                {bulkCreateMutation.isPending
                  ? 'Menerbitkan...'
                  : `Terbitkan ${selectedBuilderList.length} Jadwal Ujian Serentak`}
              </span>
            </Button>
          </div>

          {/* Table Builder */}
          <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-3 w-10 text-center">Pilih</th>
                  <th className="p-3 min-w-[200px]">Bank Soal &amp; Nama Sesi</th>
                  <th className="p-3 min-w-[200px]">Tanggal &amp; Jam Ujian</th>
                  <th className="p-3 min-w-[140px]">Ruang / Kelas</th>
                  <th className="p-3 min-w-[220px]">Pengawas Ruang / Kelas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {isLoadingBank ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Memuat daftar bank soal...
                    </td>
                  </tr>
                ) : bankList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Belum ada bank soal yang memiliki butir soal siap ujian.
                    </td>
                  </tr>
                ) : (
                  bankList.map((bank) => {
                    const row = builderRows[bank.id];
                    if (!row) return null;

                    return (
                      <tr
                        key={bank.id}
                        className={cn(
                          'transition-colors',
                          row.selected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : 'hover:bg-slate-50/70'
                        )}
                      >
                        <td className="p-3 text-center align-top">
                          <button
                            type="button"
                            onClick={() =>
                              setBuilderRows((prev) => ({
                                ...prev,
                                [bank.id]: { ...row, selected: !row.selected },
                              }))
                            }
                            className="text-violet-600 hover:text-violet-700 cursor-pointer p-1"
                            aria-label={`Pilih bank soal ${bank.judul}`}
                          >
                            {row.selected ? <CheckSquare size={17} /> : <Square size={17} className="text-slate-400" />}
                          </button>
                        </td>

                        <td className="p-3 align-top space-y-1">
                          <input
                            type="text"
                            value={row.nama_sesi}
                            onChange={(e) =>
                              setBuilderRows((prev) => ({
                                ...prev,
                                [bank.id]: { ...row, nama_sesi: e.target.value, selected: true },
                              }))
                            }
                            aria-label={`Nama sesi untuk ${bank.judul}`}
                            className="w-full px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                          <div className="text-[11px] text-slate-500">
                            <span className="font-semibold text-indigo-600">
                              {bank.Mapel?.nama_mapel || bank.MataPelajaran?.nama_mapel || '-'}
                            </span>{' '}
                            • Tingkat {bank.tingkat} • {bank.jumlah_soal || bank._count?.Soal || 0} Soal •{' '}
                            {row.target_kelas_ids.length} Rombel Target
                          </div>
                        </td>

                        <td className="p-3 align-top space-y-1.5">
                          <input
                            type="date"
                            value={row.tanggal}
                            onChange={(e) =>
                              setBuilderRows((prev) => ({
                                ...prev,
                                [bank.id]: { ...row, tanggal: e.target.value, selected: true },
                              }))
                            }
                            aria-label={`Tanggal ujian ${bank.judul}`}
                            className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={row.jam_mulai}
                              onChange={(e) =>
                                setBuilderRows((prev) => ({
                                  ...prev,
                                  [bank.id]: { ...row, jam_mulai: e.target.value, selected: true },
                                }))
                              }
                              aria-label={`Jam mulai ${bank.judul}`}
                              className="w-full px-1.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                            <span>-</span>
                            <input
                              type="time"
                              value={row.jam_selesai}
                              onChange={(e) =>
                                setBuilderRows((prev) => ({
                                  ...prev,
                                  [bank.id]: { ...row, jam_selesai: e.target.value, selected: true },
                                }))
                              }
                              aria-label={`Jam selesai ${bank.judul}`}
                              className="w-full px-1.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                          </div>
                        </td>

                        <td className="p-3 align-top">
                          <input
                            type="text"
                            value={row.ruang_ujian}
                            onChange={(e) =>
                              setBuilderRows((prev) => ({
                                ...prev,
                                [bank.id]: { ...row, ruang_ujian: e.target.value, selected: true },
                              }))
                            }
                            placeholder="Ruang 01"
                            aria-label={`Ruang ujian ${bank.judul}`}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </td>

                        <td className="p-3 align-top">
                          <SearchableSelect
                            options={pengawasSelectOptions}
                            value={row.pengawas_1_id}
                            onChange={(val) =>
                              setBuilderRows((prev) => ({
                                ...prev,
                                [bank.id]: { ...row, pengawas_1_id: val, selected: true },
                              }))
                            }
                            placeholder="Pilih Pengawas..."
                            aria-label={`Pengawas untuk ${bank.judul}`}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
