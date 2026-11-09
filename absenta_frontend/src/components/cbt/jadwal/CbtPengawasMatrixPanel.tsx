import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, Button, SearchableSelect } from '@/components/ui';
import {
  Users,
  Wand2,
  Save,
  Search,
  AlertTriangle,
  Clock,
  Printer,
  ArrowRight,
  RotateCcw,
  Calendar,
  DoorOpen,
  Filter,
  CheckCircle2,
  UserCheck,
  UserX,
  ExternalLink,
  Info,
  FileText,
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
import { formatLocalDateIndo } from '@/utils/date.utils';
import { detectNodeTingkat, TINGKAT_STYLES } from '@/components/spasial/denahTingkatHelper';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { CbtBeritaAcaraPrintModal } from './CbtBeritaAcaraPrintModal';
import { CbtDaftarHadirPrintModal } from './CbtDaftarHadirPrintModal';
import { CbtAutoPlotConfigModal, type AutoPlotConfigOptions } from './CbtAutoPlotConfigModal';
import { CbtDenahModal } from './CbtDenahModal';
import { executeAutoPlotSupervisors } from './cbtAutoPlotEngine';

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
  eventName?: string;
  targetTingkat?: number[];
}

export const CbtPengawasMatrixPanel: React.FC<CbtPengawasMatrixPanelProps> = ({
  jadwalList,
  guruList,
  isLoadingJadwal,
  onProceedToNextPhase,
  eventName,
  targetTingkat,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // ── 1. STATE FILTER & SEARCH ──
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPLOTTED' | 'PLOTTED' | 'CONFLICT'>('ALL');
  const [tingkatFilter, setTingkatFilter] = useState<'ALL' | 10 | 11 | 12 | 13>('ALL');
  const [selectedDayKey, setSelectedDayKey] = useState<string>('ALL');
  const [selectedSessionKey, setSelectedSessionKey] = useState<string>('ALL');

  // State Modal Berita Acara & Auto Plot
  const [selectedJadwalForPrint, setSelectedJadwalForPrint] = useState<CbtJadwalUjian | null>(null);
  const [selectedJadwalForDaftarHadir, setSelectedJadwalForDaftarHadir] = useState<CbtJadwalUjian | null>(null);
  const [isAutoPlotModalOpen, setIsAutoPlotModalOpen] = useState(false);
  const [showUnassignedGuruModal, setShowUnassignedGuruModal] = useState(false);

  // State Modal Denah Spasial Kampus
  const [isDenahModalOpen, setIsDenahModalOpen] = useState(false);
  const [highlightRoomCode, setHighlightRoomCode] = useState<string | null>(null);
  const [highlightRoomLabel, setHighlightRoomLabel] = useState<string>('Denah Ploting Pengawas');

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

  // ── 2. LOCAL DRAFT STATE FOR PLOTTING ──
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

  // Helper Ekstraksi Ruang, Rombel, & Tingkat Kelas
  const parseRoomAndClass = useCallback((j: CbtJadwalUjian, fallbackRoom?: string) => {
    const rawRoom = (fallbackRoom || j.setting_keamanan?.ruang_ujian || '').trim();
    const namaSesi = j.nama_sesi || '';

    let rombel = '-';
    let roomCode = rawRoom;

    const match = namaSesi.match(/\((.*?)\)/);
    if (match) {
      const inner = match[1];
      const parts = inner.split(' - ');
      if (parts.length >= 2) {
        rombel = parts[0].trim();
        if (!roomCode) roomCode = parts[1].trim();
      } else {
        rombel = inner.trim();
      }
    }

    if (!roomCode) {
      roomCode = j.setting_keamanan?.ruang_ujian_nama || j.nama_sesi || 'R.XX';
    }

    const detectedTingkat =
      detectNodeTingkat({
        label_sub: rombel,
        label_utama: roomCode,
        catatan: j.BankSoal?.tingkat,
      }) || 10;

    return {
      roomCode,
      rombel,
      tingkat: detectedTingkat,
    };
  }, []);

  // Natural Sorting Helper untuk Kode Ruang (R.01 s/d R.36)
  const getRoomNumber = (code: string) => {
    const match = code.match(/\d+/);
    return match ? parseInt(match[0], 10) : 9999;
  };

  const compareRoomCodes = (codeA: string, codeB: string) => {
    const numA = getRoomNumber(codeA);
    const numB = getRoomNumber(codeB);
    if (numA !== numB) return numA - numB;
    return codeA.localeCompare(codeB);
  };

  // ── 3. DETEKSI BENTROK JAM PENGAWAS (CONFLICT GUARD) ──
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

  // ── 4. ANALITIK BEBAN KERJA GURU (WORKLOAD RADAR) ──
  const workloadStats = useMemo(() => {
    const guruSessionCount: Record<string, number> = {};
    (guruList || []).forEach((g) => {
      guruSessionCount[g.id] = 0;
    });

    jadwalList.forEach((j) => {
      const draft = plottingDrafts[j.id];
      const p1 = draft?.pengawas_1_id || j.setting_keamanan?.pengawas_1_id;
      if (p1 && guruSessionCount[p1] !== undefined) {
        guruSessionCount[p1] = (guruSessionCount[p1] || 0) + 1;
      }
    });

    const unassignedTeachers: any[] = [];
    const assignedTeachers: Array<{ guru: any; count: number }> = [];

    (guruList || []).forEach((g) => {
      const cnt = guruSessionCount[g.id] || 0;
      if (cnt === 0) {
        unassignedTeachers.push(g);
      } else {
        assignedTeachers.push({ guru: g, count: cnt });
      }
    });

    const totalPlottedSessions = jadwalList.filter((j) => {
      const draft = plottingDrafts[j.id];
      return !!(draft?.pengawas_1_id || j.setting_keamanan?.pengawas_1_id);
    }).length;

    return {
      totalCandidates: (guruList || []).length,
      assignedCount: assignedTeachers.length,
      unassignedTeachers,
      totalPlottedSessions,
      totalSesi: jadwalList.length,
      isFullyPlotted: totalPlottedSessions === jadwalList.length && jadwalList.length > 0,
    };
  }, [guruList, jadwalList, plottingDrafts]);

  // ── 5. LIST HARI & SESI DINAMIS (TIMELINE LENS) ──
  const { availableDays, availableSessions } = useMemo(() => {
    const dayMap = new Map<string, string>();
    const sessionMap = new Map<string, string>();

    jadwalList.forEach((j) => {
      const dKey = j.tanggal_mulai ? j.tanggal_mulai.split('T')[0] : '';
      if (dKey && !dayMap.has(dKey)) {
        dayMap.set(dKey, formatLocalDateIndo(j.tanggal_mulai));
      }

      const jamM = formatLocalTimeFromISO(j.tanggal_mulai);
      const jamS = formatLocalTimeFromISO(j.tanggal_selesai);
      const sName = j.setting_keamanan?.nama_sesi_waktu || `Sesi ${jamM}–${jamS}`;
      const sKey = `${jamM}-${jamS}`;
      if (!sessionMap.has(sKey)) {
        sessionMap.set(sKey, `${sName} (${jamM}–${jamS})`);
      }
    });

    const days = Array.from(dayMap.entries()).map(([k, label]) => ({ key: k, label }));
    days.sort((a, b) => a.key.localeCompare(b.key));

    const sessions = Array.from(sessionMap.entries()).map(([k, label]) => ({ key: k, label }));

    return { availableDays: days, availableSessions: sessions };
  }, [jadwalList]);

  // ── 6. FILTER & SORT HIERARKIS TABEL ──
  const sortedAndFilteredJadwal = useMemo(() => {
    const filtered = jadwalList.filter((j) => {
      const draft = plottingDrafts[j.id];
      const info = parseRoomAndClass(j, draft?.ruang_ujian);
      const isConflict = conflictJadwalIds.has(j.id);
      const hasPengawas = !!(draft?.pengawas_1_id || j.setting_keamanan?.pengawas_1_id);

      // Filter Status Ploting
      if (statusFilter === 'UNPLOTTED' && hasPengawas) return false;
      if (statusFilter === 'PLOTTED' && !hasPengawas) return false;
      if (statusFilter === 'CONFLICT' && !isConflict) return false;

      // Filter Tingkat
      if (tingkatFilter !== 'ALL' && info.tingkat !== tingkatFilter) {
        return false;
      }

      // Filter Hari
      if (selectedDayKey !== 'ALL') {
        const dKey = j.tanggal_mulai ? j.tanggal_mulai.split('T')[0] : '';
        if (dKey !== selectedDayKey) return false;
      }

      // Filter Sesi Jam
      if (selectedSessionKey !== 'ALL') {
        const jamM = formatLocalTimeFromISO(j.tanggal_mulai);
        const jamS = formatLocalTimeFromISO(j.tanggal_selesai);
        const sKey = `${jamM}-${jamS}`;
        if (sKey !== selectedSessionKey) return false;
      }

      // Filter Search Box
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const roomName = (info.roomCode || '').toLowerCase();
        const rombel = (info.rombel || '').toLowerCase();
        const mapel = (j.BankSoal?.Mapel?.nama_mapel || j.BankSoal?.judul || '').toLowerCase();
        const p1Name = (j.setting_keamanan?.pengawas_1_nama || '').toLowerCase();
        const draftP1Name = draft?.pengawas_1_id ? (guruMap.get(draft?.pengawas_1_id)?.nama_guru || '').toLowerCase() : '';

        return (
          roomName.includes(q) ||
          rombel.includes(q) ||
          mapel.includes(q) ||
          p1Name.includes(q) ||
          draftP1Name.includes(q) ||
          j.nama_sesi.toLowerCase().includes(q)
        );
      }

      return true;
    });

    // Urutkan Alami Berdasarkan Nomor Ruang (R.01 s/d R.36)
    return filtered.sort((a, b) => {
      const draftA = plottingDrafts[a.id];
      const draftB = plottingDrafts[b.id];
      const infoA = parseRoomAndClass(a, draftA?.ruang_ujian);
      const infoB = parseRoomAndClass(b, draftB?.ruang_ujian);
      return compareRoomCodes(infoA.roomCode, infoB.roomCode);
    });
  }, [
    jadwalList,
    plottingDrafts,
    conflictJadwalIds,
    statusFilter,
    tingkatFilter,
    selectedDayKey,
    selectedSessionKey,
    searchQuery,
    parseRoomAndClass,
    guruMap,
  ]);

  // Buka Dialog Konfigurasi Ploting Otomatis Berbasis SOP Sekolah
  const handleOpenAutoPlotModal = () => {
    const totalCandidates = pendidikList.length + tenagaKependidikanList.length;
    if (totalCandidates === 0 && guruList.length === 0) {
      toast.error('Data guru pendidik belum tersedia untuk distribusi otomatis');
      return;
    }
    setIsAutoPlotModalOpen(true);
  };

  // Eksekusi Distribusi Otomatis
  const handleApplyAutoPlot = (config: AutoPlotConfigOptions) => {
    let candidates =
      config.candidateScope === 'PENDIDIK_ONLY'
        ? pendidikList.length > 0
          ? pendidikList
          : guruList
        : [...pendidikList, ...tenagaKependidikanList];

    if (candidates.length === 0) candidates = guruList;

    if (!candidates.length) {
      toast.error('Tidak ada data guru yang tersedia untuk diploting');
      return;
    }

    const result = executeAutoPlotSupervisors(jadwalList, plottingDrafts, candidates, config);

    if (result.assignedCount === 0) {
      toast('Tidak ada sesi yang diploting. Pastikan ada sesi ujian yang belum terplot atau pilih opsi "Kocok Ulang Seluruh Sesi".', {
        icon: 'ℹ️',
      });
      return;
    }

    setPlottingDrafts(result.nextDrafts);

    toast.success(
      `Berhasil mendistribusikan ${result.assignedCount} sesi ke ${candidates.length} guru pengawas!`,
      { duration: 4000 }
    );
  };

  const dirtyPlottingItems = useMemo(() => {
    return Object.values(plottingDrafts).filter((d) => d.dirty);
  }, [plottingDrafts]);

  // Kosongkan Ploting Massal
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
    if (workloadStats.totalPlottedSessions === 0 && dirtyPlottingItems.length === 0) {
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

  // Simpan Ploting ke Backend
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

  // Buka Denah Ruang Tertentu
  const handleOpenRoomDenah = (roomCode: string, label?: string) => {
    setHighlightRoomCode(roomCode);
    setHighlightRoomLabel(label || `Ruang: ${roomCode}`);
    setIsDenahModalOpen(true);
  };

  const tz = getTimezone();
  const tzLabel = getTimezoneLabel(tz);

  return (
    <div className="space-y-4">
      {/* ── 1. RADAR BEBAN MENGAWAS GURU & STATUS OPERASIONAL (THEME-AWARE) ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-white shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
                <Users size={18} />
              </span>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Meja Kerja Ploting Pengawas &amp; Proktor Ujian
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Alokasikan pengawas ruang berurutan R.01–R.n per sesi ujian. Dilengkapi deteksi bentrok jam dan aturan silang SOP.
            </p>
          </div>

          {/* Action Buttons Top Bar */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {workloadStats.totalPlottedSessions > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={clearPlottingMutation.isPending}
                onClick={handleConfirmClearAllPlotting}
                className="text-xs h-9 px-3 font-bold text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 dark:text-rose-300 dark:border-rose-800 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 cursor-pointer"
                title="Kosongkan seluruh penugasan pengawas"
              >
                <RotateCcw size={13} className={cn('mr-1.5', clearPlottingMutation.isPending && 'animate-spin')} />
                <span>Kosongkan Ploting</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenAutoPlotModal}
              className="text-xs h-9 px-3.5 font-bold text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:border-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 cursor-pointer shadow-2xs"
              title="Distribusi otomatis pengawas menggunakan SOP silang sekolah"
            >
              <Wand2 size={14} className="mr-1.5 text-indigo-600 dark:text-indigo-400" />
              <span>Plot Otomatis Guru (SOP Silang)</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={dirtyPlottingItems.length === 0 || bulkPlottingMutation.isPending}
              onClick={() => bulkPlottingMutation.mutate()}
              className="text-xs h-9 px-4 font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer disabled:opacity-40"
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

        {/* ── METRIK BEBAN PENGAWAS (THEME-AWARE HIGH-DENSITY STRIP) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Sesi Ujian
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5 flex items-baseline gap-1.5">
              <span>{workloadStats.totalSesi}</span>
              <span className="text-xs text-slate-400 font-normal">Sesi</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
              {workloadStats.totalPlottedSessions} Sesi sudah terplot
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
              <UserCheck size={12} />
              <span>Guru Bertugas</span>
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-baseline gap-1.5">
              <span>{workloadStats.assignedCount}</span>
              <span className="text-xs text-slate-400 font-normal">Guru</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
              Aktif dalam jadwal pengawasan
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block flex items-center gap-1">
              <UserX size={12} />
              <span>Beban 0 (Belum Bertugas)</span>
            </span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 flex items-baseline gap-1.5">
              <span>{workloadStats.unassignedTeachers.length}</span>
              <span className="text-xs text-slate-400 font-normal">Guru</span>
            </div>
            <button
              type="button"
              onClick={() => setShowUnassignedGuruModal(true)}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold underline cursor-pointer mt-1 block"
            >
              Lihat daftar guru siap tugas →
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              {conflictJadwalIds.size > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-bold">
                  <AlertTriangle size={12} />
                  <span>Sesi Bentrok Jam!</span>
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  <span>Jadwal Pengawas Aman</span>
                </span>
              )}
            </span>
            <div
              className={cn(
                'text-xl font-black mt-0.5 flex items-baseline gap-1.5',
                conflictJadwalIds.size > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
              )}
            >
              <span>{conflictJadwalIds.size}</span>
              <span className="text-xs text-slate-400 font-normal">Sesi</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
              {conflictJadwalIds.size > 0 ? 'Guru sama di jam yang sama' : '0 Konflik penugasan'}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. DRIVEN-CENTRIC NAVIGATION & FILTER TOOLBAR ── */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        {/* Baris 1: Filter Hari (Timeline Switcher) */}
        {availableDays.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 shrink-0 flex items-center gap-1">
              <Calendar size={13} className="text-indigo-500" />
              <span>Hari:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedDayKey('ALL')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0',
                selectedDayKey === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-2xs font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              Semua Hari ({availableDays.length})
            </button>
            {availableDays.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setSelectedDayKey(d.key)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0',
                  selectedDayKey === d.key
                    ? 'bg-indigo-600 text-white shadow-2xs font-black'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}

        {/* Baris 2: Sub-filter Sesi & Tingkat & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Status Filter */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
              {[
                { key: 'ALL', label: `Semua (${workloadStats.totalSesi})` },
                { key: 'UNPLOTTED', label: `⚠️ Belum Diplot (${workloadStats.totalSesi - workloadStats.totalPlottedSessions})` },
                { key: 'PLOTTED', label: `✅ Sudah Diplot (${workloadStats.totalPlottedSessions})` },
                ...(conflictJadwalIds.size > 0
                  ? [{ key: 'CONFLICT', label: `🚨 Bentrok (${conflictJadwalIds.size})` }]
                  : []),
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStatusFilter(st.key as any)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0',
                    statusFilter === st.key
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Tingkat Filter */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-1.5">TK:</span>
              {[
                { val: 'ALL', label: 'Semua' },
                { val: 10, label: 'X' },
                { val: 11, label: 'XI' },
                { val: 12, label: 'XII' },
              ].map((tk) => (
                <button
                  key={String(tk.val)}
                  type="button"
                  onClick={() => setTingkatFilter(tk.val as any)}
                  className={cn(
                    'px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    tingkatFilter === tk.val
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  {tk.label}
                </button>
              ))}
            </div>

            {/* Sesi Jam Filter */}
            {availableSessions.length > 1 && (
              <select
                value={selectedSessionKey}
                onChange={(e) => setSelectedSessionKey(e.target.value)}
                className="text-xs font-semibold py-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">Semua Sesi Jam</option>
                {availableSessions.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari R.01, X PHT 2, nama guru..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
            />
          </div>
        </div>
      </div>

      {/* ── 3. TABEL OPERASIONAL PLOTING PENGAWAS (HIGH-DENSITY & CONTROLLED) ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        {isLoadingJadwal ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-medium">Memuat data jadwal &amp; plotting pengawas...</p>
          </div>
        ) : sortedAndFilteredJadwal.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Filter size={20} />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Tidak ada sesi ujian yang cocok dengan filter
            </p>
            <p className="text-xs text-slate-400">
              Coba ganti filter hari, tingkat, atau ubah kata kunci pencarian.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-3">Ruang Ujian</th>
                  <th className="py-3 px-3">Tingkat &amp; Rombel</th>
                  <th className="py-3 px-3">Mata Pelajaran &amp; Sesi</th>
                  <th className="py-3 px-3">Waktu Pelaksanaan</th>
                  <th className="py-3 px-3 min-w-[280px]">Pengawas Ruang 1 (Wajib)</th>
                  <th className="py-3 px-3 min-w-[240px]">Proktor / Pengawas 2</th>
                  <th className="py-3 px-3 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {sortedAndFilteredJadwal.map((row, idx) => {
                  const draft = plottingDrafts[row.id] || {
                    jadwal_id: row.id,
                    ruang_ujian: '',
                    pengawas_1_id: '',
                    proktor_id: '',
                    dirty: false,
                  };

                  const info = parseRoomAndClass(row, draft.ruang_ujian);
                  const tkMeta = TINGKAT_STYLES[info.tingkat] || TINGKAT_STYLES[10];
                  const isConflict = conflictJadwalIds.has(row.id);

                  const jamMulai = formatLocalTimeFromISO(row.tanggal_mulai);
                  const jamSelesai = formatLocalTimeFromISO(row.tanggal_selesai);
                  const mapelName =
                    row.BankSoal?.Mapel?.nama_mapel ||
                    row.BankSoal?.MataPelajaran?.nama_mapel ||
                    row.BankSoal?.judul ||
                    'Mapel Umum';

                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'transition-colors',
                        isConflict
                          ? 'bg-rose-50/50 dark:bg-rose-950/20'
                          : draft.dirty
                          ? 'bg-indigo-50/30 dark:bg-indigo-950/20'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      )}
                    >
                      {/* No */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px] align-middle">
                        {idx + 1}
                      </td>

                      {/* Ruang Ujian (Terkunci & Terhubung ke Denah) */}
                      <td className="py-2.5 px-3 align-middle">
                        <button
                          type="button"
                          onClick={() => handleOpenRoomDenah(info.roomCode, `Ploting Ruang: ${info.roomCode}`)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg border font-mono font-black text-xs inline-flex items-center gap-1.5 shadow-2xs hover:scale-105 transition-all cursor-pointer',
                            tkMeta.bg,
                            tkMeta.border,
                            tkMeta.text
                          )}
                          title="Klik untuk melihat posisi ruang di Denah Kampus"
                        >
                          <DoorOpen size={13} className={tkMeta.accent} />
                          <span>{info.roomCode}</span>
                        </button>
                      </td>

                      {/* Tingkat & Rombel */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded-md', tkMeta.badge)}>
                            {tkMeta.badgeLabel}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {info.rombel}
                          </span>
                        </div>
                      </td>

                      {/* Sesi & Mapel */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={row.nama_sesi}>
                          {mapelName}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                          Token: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{row.token_ujian || '-'}</span> • {row.durasi_menit} mnt
                        </div>
                      </td>

                      {/* Waktu Pelaksanaan */}
                      <td className="py-2.5 px-3 align-middle text-slate-600 dark:text-slate-300">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                          {formatLocalDateIndo(row.tanggal_mulai)}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          <span>{jamMulai}–{jamSelesai} {tzLabel}</span>
                        </div>
                      </td>

                      {/* Pengawas Ruang 1 (Wajib) */}
                      <td className="py-2.5 px-3 align-middle">
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
                            <span>Guru ini bentrok jam dengan ruang lain!</span>
                          </p>
                        )}
                      </td>

                      {/* Proktor / Pengawas 2 */}
                      <td className="py-2.5 px-3 align-middle">
                        <SearchableSelect
                          options={pengawasSelectOptions}
                          value={draft.proktor_id}
                          onChange={(val) => handleUpdatePlotRow(row.id, 'proktor_id', val)}
                          placeholder="Opsional (Tanpa Proktor)..."
                          aria-label={`Proktor untuk ${row.nama_sesi}`}
                          clearable={true}
                        />
                      </td>

                      {/* Aksi Berita Acara & Reset Sesi */}
                      <td className="py-2.5 px-3 align-middle text-center">
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
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedJadwalForPrint(row)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                            title="Pratinjau &amp; Cetak Berita Acara Ruang Ujian"
                          >
                            <Printer size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedJadwalForDaftarHadir(row)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
                            title="Pratinjau &amp; Cetak Daftar Hadir Peserta Ujian (CBT)"
                          >
                            <FileText size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. FOOTER NAVIGASI ANATAR-FASE ── */}
      {onProceedToNextPhase && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Kesiapan Ploting Pengawas ({workloadStats.totalPlottedSessions}/{workloadStats.totalSesi} Sesi)
            </h4>
            <p className="text-[11px] text-slate-500">
              {dirtyPlottingItems.length > 0
                ? `Ada ${dirtyPlottingItems.length} perubahan ploting yang belum disimpan. Klik "Simpan Ploting" di atas sebelum beralih.`
                : 'Seluruh ploting pengawas tersimpan aman di sistem.'}
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={onProceedToNextPhase}
            className="flex items-center gap-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 text-xs px-4 py-2 shadow-xs"
          >
            <span>Lanjut ke Fase 5: Hari H &amp; Live Monitoring</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      )}

      {/* ── MODAL CETAK BERITA ACARA RUANG ── */}
      {selectedJadwalForPrint && (
        <CbtBeritaAcaraPrintModal
          isOpen={Boolean(selectedJadwalForPrint)}
          onClose={() => setSelectedJadwalForPrint(null)}
          jadwal={selectedJadwalForPrint}
          eventName={eventName}
        />
      )}

      {/* ── MODAL CETAK DAFTAR HADIR RUANG (DIGITAL SIGNATURES) ── */}
      {selectedJadwalForDaftarHadir && (
        <CbtDaftarHadirPrintModal
          isOpen={Boolean(selectedJadwalForDaftarHadir)}
          onClose={() => setSelectedJadwalForDaftarHadir(null)}
          jadwal={selectedJadwalForDaftarHadir}
          eventName={eventName}
        />
      )}

      {/* ── MODAL AUTO PLOT SOP SILANG ── */}
      {isAutoPlotModalOpen && (
        <CbtAutoPlotConfigModal
          isOpen={isAutoPlotModalOpen}
          onClose={() => setIsAutoPlotModalOpen(false)}
          onConfirm={handleApplyAutoPlot}
          jadwalList={jadwalList}
          pendidikCount={pendidikList.length || guruList.length}
          tenagaKependidikanCount={tenagaKependidikanList.length}
          alreadyPlottedCount={workloadStats.totalPlottedSessions}
        />
      )}

      {/* ── MODAL DENAH SPASIAL KAMPUS ── */}
      {isDenahModalOpen && (
        <CbtDenahModal
          isOpen={isDenahModalOpen}
          onClose={() => setIsDenahModalOpen(false)}
          eventName="Denah Ploting Pengawas Ruang CBT"
          highlightRoomCode={highlightRoomCode}
          highlightLabel={highlightRoomLabel}
          isReadOnly={true}
        />
      )}

      {/* ── MODAL GURU BELUM BERTUGAS (BEBAN 0) ── */}
      {showUnassignedGuruModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <UserX size={16} />
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Daftar Guru Beban 0 ({workloadStats.unassignedTeachers.length} Belum Bertugas)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUnassignedGuruModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-bold p-1"
              >
                ✕ Tutup
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Guru di bawah ini belum dialokasikan untuk mengawas di sesi ujian manapun. Anda dapat mem-plot mereka ke ruangan yang masih kosong.
            </p>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
              {workloadStats.unassignedTeachers.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">
                  Seluruh guru sudah teralokasikan dalam jadwal pengawasan.
                </p>
              ) : (
                workloadStats.unassignedTeachers.map((g, idx) => (
                  <div key={g.id || idx} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {g.nama_guru}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {g.nip ? `NIP. ${g.nip}` : 'Non-NIP'}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-semibold">
                      {g.jenis_ptk || 'PENDIDIK'}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowUnassignedGuruModal(false)}
                className="text-xs"
              >
                Selesai
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CbtPengawasMatrixPanel;
