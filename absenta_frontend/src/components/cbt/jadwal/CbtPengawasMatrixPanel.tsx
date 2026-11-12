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
  Zap,
  LayoutGrid,
  ListFilter,
} from 'lucide-react';
import useConfirm from '@/hooks/useConfirm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtJadwalUjian, CbtEventItem } from '@/types/cbt.types';
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
  topFlightDeck?: React.ReactNode;
  jadwalList: CbtJadwalUjian[];
  guruList: any[];
  isLoadingJadwal: boolean;
  refetchJadwal?: () => void;
  onProceedToNextPhase?: () => void;
  eventName?: string;
  targetTingkat?: number[];
  activeEvent?: CbtEventItem | null;
}

export const CbtPengawasMatrixPanel: React.FC<CbtPengawasMatrixPanelProps> = ({
  topFlightDeck,
  jadwalList,
  guruList,
  isLoadingJadwal,
  refetchJadwal,
  onProceedToNextPhase,
  eventName,
  targetTingkat,
  activeEvent,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // ── 1. STATE FILTER & SEARCH ──
  const [viewMode, setViewMode] = useState<'MATRIX' | 'LIST'>('MATRIX');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPLOTTED' | 'PLOTTED' | 'CONFLICT'>('ALL');
  const [tingkatFilter, setTingkatFilter] = useState<'ALL' | 10 | 11 | 12 | 13>('ALL');
  const [selectedDayKey, setSelectedDayKey] = useState<string>('ALL');
  const [selectedSessionKey, setSelectedSessionKey] = useState<string>('ALL');

  // ── PENGATURAN TAMPILAN PROKTOR / PENGAWAS 2 ──
  // Bawaan: membaca pengaturan event (default: false / disembunyikan jika tidak diterapkan)
  const [isProctorEnabledLocal, setIsProctorEnabledLocal] = useState<boolean | null>(null);
  const showProctor = isProctorEnabledLocal !== null ? isProctorEnabledLocal : Boolean(activeEvent?.enable_proctor);

  useEffect(() => {
    setIsProctorEnabledLocal(null);
  }, [activeEvent?.id]);

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

    // Ambil kurung TERAKHIR agar tidak salah membaca singkatan event seperti (ASAS)/(PSAS)
    const allMatches = Array.from(namaSesi.matchAll(/\(([^()]+)\)/g));
    if (allMatches.length > 0) {
      const inner = allMatches[allMatches.length - 1][1];
      const parts = inner.split(' - ');
      if (parts.length >= 2) {
        rombel = parts[0].trim();
        if (!roomCode) roomCode = parts[1].trim();
      } else {
        const cleaned = inner.trim();
        if (!['ASAS', 'PSAS', 'PSTS', 'SAS', 'SAT', 'STS'].includes(cleaned.toUpperCase())) {
          rombel = cleaned;
        }
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

  // ── KEPATUHAN EVENT PANITIA & SASARAN TINGKAT ──
  const effectiveJadwalList = useMemo(() => {
    return (jadwalList || []).filter((j) => {
      // 0. Sesi remedial dikelola mandiri oleh Guru Mapel, abaikan dari matriks pengawas panitia
      if ((j.setting_keamanan as any)?.is_remedial) return false;
      // 1. Jika event_id tertera, harus cocok dengan activeEvent
      if (activeEvent?.id && j.setting_keamanan?.event_id) {
        if (j.setting_keamanan.event_id !== activeEvent.id) return false;
      }
      // 2. Kepatuhan Target Tingkat Event
      if (targetTingkat && targetTingkat.length > 0) {
        const info = parseRoomAndClass(j);
        if (!targetTingkat.includes(info.tingkat)) return false;
      }
      return true;
    });
  }, [jadwalList, activeEvent?.id, targetTingkat, parseRoomAndClass]);

  // Pilihan Tab Filter Tingkat Dinamis Sesuai Target Event (Menghilangkan Kelas di Luar Sasaran)
  const tingkatFilterOptions = useMemo(() => {
    const options: Array<{ val: 'ALL' | 10 | 11 | 12 | 13; label: string }> = [
      { val: 'ALL', label: 'Semua' },
    ];
    const romanMap: Record<number, string> = { 10: 'X', 11: 'XI', 12: 'XII', 13: 'XIII' };
    const effectiveTingkats = (targetTingkat && targetTingkat.length > 0)
      ? [...targetTingkat].sort((a, b) => a - b)
      : [10, 11, 12];

    effectiveTingkats.forEach((tk) => {
      options.push({ val: tk as any, label: romanMap[tk] || String(tk) });
    });
    return options;
  }, [targetTingkat]);

  // ── 3. DETEKSI BENTROK JAM PENGAWAS (CONFLICT GUARD) ──
  const conflictJadwalIds = useMemo(() => {
    const conflicts = new Set<string>();
    for (let i = 0; i < effectiveJadwalList.length; i++) {
      const a = effectiveJadwalList[i];
      const draftA = plottingDrafts[a.id];
      const pA = draftA?.pengawas_1_id;
      if (!pA) continue;

      const startA = new Date(a.tanggal_mulai).getTime();
      const endA = new Date(a.tanggal_selesai).getTime();

      for (let k = i + 1; k < effectiveJadwalList.length; k++) {
        const b = effectiveJadwalList[k];
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
  }, [effectiveJadwalList, plottingDrafts]);

  // ── 4. ANALITIK BEBAN KERJA GURU (WORKLOAD RADAR) ──
  const workloadStats = useMemo(() => {
    const guruSessionCount: Record<string, number> = {};
    (guruList || []).forEach((g) => {
      guruSessionCount[g.id] = 0;
    });

    effectiveJadwalList.forEach((j) => {
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

    const totalPlottedSessions = effectiveJadwalList.filter((j) => {
      const draft = plottingDrafts[j.id];
      return !!(draft?.pengawas_1_id || j.setting_keamanan?.pengawas_1_id);
    }).length;

    return {
      totalCandidates: (guruList || []).length,
      assignedCount: assignedTeachers.length,
      unassignedTeachers,
      totalPlottedSessions,
      totalSesi: effectiveJadwalList.length,
      isFullyPlotted: totalPlottedSessions === effectiveJadwalList.length && effectiveJadwalList.length > 0,
    };
  }, [guruList, effectiveJadwalList, plottingDrafts]);

  // ── 5. LIST HARI & SESI DINAMIS (TIMELINE LENS) ──
  const { availableDays, availableSessions } = useMemo(() => {
    const dayMap = new Map<string, string>();
    const sessionMap = new Map<string, string>();

    effectiveJadwalList.forEach((j) => {
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
  }, [effectiveJadwalList]);

  // ── 6. FILTER & SORT HIERARKIS TABEL ──
  const sortedAndFilteredJadwal = useMemo(() => {
    const filtered = effectiveJadwalList.filter((j) => {
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

    // Urutkan Alami Berdasarkan Nomor Ruang (R.01 s/d R.36), kemudian jam mulai kronologis
    return filtered.sort((a, b) => {
      const draftA = plottingDrafts[a.id];
      const draftB = plottingDrafts[b.id];
      const infoA = parseRoomAndClass(a, draftA?.ruang_ujian);
      const infoB = parseRoomAndClass(b, draftB?.ruang_ujian);
      const roomDiff = compareRoomCodes(infoA.roomCode, infoB.roomCode);
      if (roomDiff !== 0) return roomDiff;
      return new Date(a.tanggal_mulai).getTime() - new Date(b.tanggal_mulai).getTime();
    });
  }, [
    effectiveJadwalList,
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

  // ── 7. DATA STRUKTUR MATRIKS RUANG × SESI ──
  // Hari aktif untuk mode Matriks (default ke hari pertama jika 'ALL')
  const currentMatrixDayKey = useMemo(() => {
    if (selectedDayKey !== 'ALL') return selectedDayKey;
    return availableDays[0]?.key || '';
  }, [selectedDayKey, availableDays]);

  // Sesi ujian pada hari aktif (untuk mode Matriks)
  const activeDaySchedules = useMemo(() => {
    return effectiveJadwalList.filter((j) => {
      const dKey = j.tanggal_mulai ? j.tanggal_mulai.split('T')[0] : '';
      return !currentMatrixDayKey || dKey === currentMatrixDayKey;
    });
  }, [effectiveJadwalList, currentMatrixDayKey]);

  // Helper untuk mendapatkan key slot sesi (nama_sesi_waktu jika ada, atau jam mulai)
  const getScheduleSlotKey = useCallback((j: CbtJadwalUjian) => {
    const sName = j.setting_keamanan?.nama_sesi_waktu?.trim();
    if (sName) return sName;
    return formatLocalTimeFromISO(j.tanggal_mulai);
  }, []);

  // Kolom-kolom sesi ujian unik untuk hari aktif (diurutkan kronologis)
  const activeDaySessions = useMemo(() => {
    const slotMap = new Map<
      string,
      {
        slotKey: string;
        namaSesi: string;
        jamMulai: string;
        jamSelesai: string;
        startTimestamp: number;
      }
    >();

    activeDaySchedules.forEach((j) => {
      const jamM = formatLocalTimeFromISO(j.tanggal_mulai);
      const jamS = formatLocalTimeFromISO(j.tanggal_selesai);
      const sName = j.setting_keamanan?.nama_sesi_waktu?.trim() || '';
      const key = sName || jamM;
      const startMs = new Date(j.tanggal_mulai).getTime();

      if (!slotMap.has(key)) {
        slotMap.set(key, {
          slotKey: key,
          namaSesi: sName || `Sesi ${jamM}`,
          jamMulai: jamM,
          jamSelesai: jamS,
          startTimestamp: startMs,
        });
      } else {
        const existing = slotMap.get(key)!;
        if (startMs < existing.startTimestamp) {
          existing.startTimestamp = startMs;
          existing.jamMulai = jamM;
        }
      }
    });

    const list = Array.from(slotMap.values()).sort((a, b) => a.startTimestamp - b.startTimestamp);
    return list.map((item, idx) => ({
      ...item,
      displayTitle: item.namaSesi.startsWith('Sesi') ? item.namaSesi : `Sesi ${idx + 1}`,
      sessionIndex: idx + 1,
    }));
  }, [activeDaySchedules]);

  // Baris-baris Matriks Ruang (Ruang × Sesi)
  const roomMatrixRows = useMemo(() => {
    const roomsMap = new Map<
      string,
      {
        roomCode: string;
        rombel: string;
        tingkat: number;
        sessions: Record<string, CbtJadwalUjian>;
      }
    >();

    activeDaySchedules.forEach((j) => {
      const draft = plottingDrafts[j.id];
      const info = parseRoomAndClass(j, draft?.ruang_ujian);

      // Filter Tingkat
      if (tingkatFilter !== 'ALL' && info.tingkat !== tingkatFilter) {
        return;
      }

      if (!roomsMap.has(info.roomCode)) {
        roomsMap.set(info.roomCode, {
          roomCode: info.roomCode,
          rombel: info.rombel,
          tingkat: info.tingkat,
          sessions: {},
        });
      }

      const roomItem = roomsMap.get(info.roomCode)!;
      const slotKey = getScheduleSlotKey(j);
      roomItem.sessions[slotKey] = j;

      if (roomItem.rombel === '-' && info.rombel !== '-') {
        roomItem.rombel = info.rombel;
        roomItem.tingkat = info.tingkat;
      }
    });

    let list = Array.from(roomsMap.values());

    // Filter Status Ploting
    if (statusFilter === 'UNPLOTTED') {
      list = list.filter((r) => {
        const jList = Object.values(r.sessions);
        return jList.some((j) => {
          const d = plottingDrafts[j.id];
          return !(d?.pengawas_1_id || j.setting_keamanan?.pengawas_1_id);
        });
      });
    } else if (statusFilter === 'PLOTTED') {
      list = list.filter((r) => {
        const jList = Object.values(r.sessions);
        return (
          jList.length > 0 &&
          jList.every((j) => {
            const d = plottingDrafts[j.id];
            return !!(d?.pengawas_1_id || j.setting_keamanan?.pengawas_1_id);
          })
        );
      });
    } else if (statusFilter === 'CONFLICT') {
      list = list.filter((r) => {
        const jList = Object.values(r.sessions);
        return jList.some((j) => conflictJadwalIds.has(j.id));
      });
    }

    // Filter Search Box
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const matchRoom = r.roomCode.toLowerCase().includes(q);
        const matchRombel = r.rombel.toLowerCase().includes(q);
        if (matchRoom || matchRombel) return true;

        return Object.values(r.sessions).some((j) => {
          const d = plottingDrafts[j.id];
          const mapel = (j.BankSoal?.Mapel?.nama_mapel || j.BankSoal?.judul || '').toLowerCase();
          const p1Name = (j.setting_keamanan?.pengawas_1_nama || '').toLowerCase();
          const draftP1Name = d?.pengawas_1_id
            ? (guruMap.get(d?.pengawas_1_id)?.nama_guru || '').toLowerCase()
            : '';
          const prName = (j.setting_keamanan?.proktor_nama || '').toLowerCase();
          const draftPrName = d?.proktor_id
            ? (guruMap.get(d?.proktor_id)?.nama_guru || '').toLowerCase()
            : '';
          return (
            mapel.includes(q) ||
            p1Name.includes(q) ||
            draftP1Name.includes(q) ||
            prName.includes(q) ||
            draftPrName.includes(q) ||
            j.nama_sesi.toLowerCase().includes(q)
          );
        });
      });
    }

    // Urutkan alami kode ruang (R.01 s/d R.36)
    return list.sort((a, b) => compareRoomCodes(a.roomCode, b.roomCode));
  }, [
    activeDaySchedules,
    plottingDrafts,
    tingkatFilter,
    statusFilter,
    conflictJadwalIds,
    searchQuery,
    parseRoomAndClass,
    getScheduleSlotKey,
    guruMap,
  ]);

  // ── 8. OPERASI CEPAT SALIN PENGAWAS SEHARIAN ──
  // Salin Pengawas Seharian untuk 1 Ruangan (Sesi 1 -> Sesi 2, 3...)
  const handleCopyRoomFullDay = useCallback(
    (roomRow: { roomCode: string; sessions: Record<string, CbtJadwalUjian> }) => {
      if (activeDaySessions.length <= 1) {
        toast('Hanya terdapat 1 sesi ujian di hari ini.', { icon: 'ℹ️' });
        return;
      }

      // Cari sesi yang menjadi sumber penugasan (utamakan Sesi 1, atau sesi terisi pertama)
      let sourceSession: CbtJadwalUjian | null = null;
      let sourceDraft: PlottingDraftRow | null = null;

      for (const slot of activeDaySessions) {
        const j = roomRow.sessions[slot.slotKey];
        if (j) {
          const d = plottingDrafts[j.id] || {
            jadwal_id: j.id,
            ruang_ujian: roomRow.roomCode,
            pengawas_1_id: j.setting_keamanan?.pengawas_1_id || '',
            proktor_id: j.setting_keamanan?.proktor_id || j.setting_keamanan?.pengawas_2_id || '',
            dirty: false,
          };
          if (d.pengawas_1_id || d.proktor_id) {
            sourceSession = j;
            sourceDraft = d;
            break;
          }
        }
      }

      if (!sourceSession || !sourceDraft || (!sourceDraft.pengawas_1_id && !sourceDraft.proktor_id)) {
        toast.error(`Pilih Pengawas Ruang pada salah satu sesi di ${roomRow.roomCode} terlebih dahulu.`);
        return;
      }

      const nextDrafts = { ...plottingDrafts };
      let updatedCount = 0;

      activeDaySessions.forEach((slot) => {
        const target = roomRow.sessions[slot.slotKey];
        if (!target || target.id === sourceSession!.id) return;

        const curr = nextDrafts[target.id] || {
          jadwal_id: target.id,
          ruang_ujian: roomRow.roomCode,
          pengawas_1_id: target.setting_keamanan?.pengawas_1_id || '',
          proktor_id: target.setting_keamanan?.proktor_id || target.setting_keamanan?.pengawas_2_id || '',
          dirty: false,
        };

        if (
          curr.pengawas_1_id !== sourceDraft!.pengawas_1_id ||
          curr.proktor_id !== sourceDraft!.proktor_id
        ) {
          nextDrafts[target.id] = {
            ...curr,
            pengawas_1_id: sourceDraft!.pengawas_1_id,
            proktor_id: sourceDraft!.proktor_id,
            dirty: true,
          };
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        setPlottingDrafts(nextDrafts);
        const p1Name = sourceDraft.pengawas_1_id ? guruMap.get(sourceDraft.pengawas_1_id)?.nama_guru : '';
        toast.success(
          `⚡ ${p1Name ? `Pengawas ${p1Name}` : 'Pengawas'} berhasil disalin ke seluruh sesi di ${roomRow.roomCode}!`
        );
      } else {
        toast('Seluruh sesi di ruang ini sudah memiliki pengawas yang sama.', { icon: 'ℹ️' });
      }
    },
    [activeDaySessions, plottingDrafts, guruMap]
  );

  // Kosongkan Pengawas Seharian untuk 1 Ruangan
  const handleClearRoomFullDay = useCallback(
    (roomRow: { roomCode: string; sessions: Record<string, CbtJadwalUjian> }) => {
      const nextDrafts = { ...plottingDrafts };
      let clearedCount = 0;

      Object.values(roomRow.sessions).forEach((j) => {
        const curr = nextDrafts[j.id] || {
          jadwal_id: j.id,
          ruang_ujian: roomRow.roomCode,
          pengawas_1_id: j.setting_keamanan?.pengawas_1_id || '',
          proktor_id: j.setting_keamanan?.proktor_id || j.setting_keamanan?.pengawas_2_id || '',
          dirty: false,
        };
        if (curr.pengawas_1_id || curr.proktor_id) {
          nextDrafts[j.id] = {
            ...curr,
            pengawas_1_id: '',
            proktor_id: '',
            dirty: true,
          };
          clearedCount++;
        }
      });

      if (clearedCount > 0) {
        setPlottingDrafts(nextDrafts);
        toast.success(`Pengawas di ${roomRow.roomCode} berhasil dikosongkan untuk hari ini.`);
      }
    },
    [plottingDrafts]
  );

  // Salin Sesi 1 ke Seluruh Sesi Seharian untuk SEMUA Ruangan
  const handleCopyAllRoomsFullDay = useCallback(() => {
    if (activeDaySessions.length <= 1) {
      toast('Hari ini hanya terdapat 1 sesi ujian, tidak perlu disalin ke sesi lain.', { icon: 'ℹ️' });
      return;
    }

    const firstSlot = activeDaySessions[0];
    if (!firstSlot) return;

    let copiedSessionsCount = 0;
    let affectedRoomsCount = 0;
    const nextDrafts = { ...plottingDrafts };

    roomMatrixRows.forEach((r) => {
      const session1 = r.sessions[firstSlot.slotKey];
      if (!session1) return;

      const d1 = nextDrafts[session1.id] || {
        jadwal_id: session1.id,
        ruang_ujian: r.roomCode,
        pengawas_1_id: session1.setting_keamanan?.pengawas_1_id || '',
        proktor_id: session1.setting_keamanan?.proktor_id || session1.setting_keamanan?.pengawas_2_id || '',
        dirty: false,
      };

      const p1 = d1.pengawas_1_id;
      const pr = d1.proktor_id;

      if (!p1 && !pr) return; // Belum diisi Sesi 1 nya

      let roomChanged = false;
      for (let i = 1; i < activeDaySessions.length; i++) {
        const slot = activeDaySessions[i];
        const otherSession = r.sessions[slot.slotKey];
        if (!otherSession) continue;

        const curr = nextDrafts[otherSession.id] || {
          jadwal_id: otherSession.id,
          ruang_ujian: r.roomCode,
          pengawas_1_id: otherSession.setting_keamanan?.pengawas_1_id || '',
          proktor_id: otherSession.setting_keamanan?.proktor_id || otherSession.setting_keamanan?.pengawas_2_id || '',
          dirty: false,
        };

        if (curr.pengawas_1_id !== p1 || curr.proktor_id !== pr) {
          nextDrafts[otherSession.id] = {
            ...curr,
            pengawas_1_id: p1,
            proktor_id: pr,
            dirty: true,
          };
          copiedSessionsCount++;
          roomChanged = true;
        }
      }

      if (roomChanged) {
        affectedRoomsCount++;
      }
    });

    if (copiedSessionsCount === 0) {
      toast.error('Belum ada ruangan yang memiliki Pengawas di Sesi 1 untuk disalin.');
      return;
    }

    setPlottingDrafts(nextDrafts);
    toast.success(
      `⚡ Berhasil menyalin Pengawas Sesi 1 ke ${copiedSessionsCount} sesi pada ${affectedRoomsCount} ruangan! Klik "Simpan" untuk menerapkan.`,
      { duration: 5000 }
    );
  }, [activeDaySessions, roomMatrixRows, plottingDrafts]);

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

    const result = executeAutoPlotSupervisors(effectiveJadwalList, plottingDrafts, candidates, config);

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
      refetchJadwal?.();
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
      refetchJadwal?.();
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
    <div className="space-y-3 w-full max-w-full min-w-0">

      {/* ── 1 RUANG SEAMLESS FLIGHT DECK + TOOLBAR ── */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
        {topFlightDeck}

        {/* ── Single-Row Unified Master Filter & Action Toolbar (1 Ruang, Zero Waste Vertical) ── */}
        <div className="p-2 sm:p-2.5 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col xl:flex-row xl:items-center justify-between gap-2">
          {/* Left: Filters & Search */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {/* Mode Tampilan Switcher (Matriks Ruang vs Daftar Terurai) */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('MATRIX')}
                className={cn(
                  'px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                  viewMode === 'MATRIX'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-900'
                )}
                title="Tampilan Matriks: 1 baris per Ruang dengan kolom Sesi (34 baris)"
              >
                <LayoutGrid size={12} />
                <span>Matriks Ruang</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className={cn(
                  'px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                  viewMode === 'LIST'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-900'
                )}
                title="Tampilan Daftar Terurai per Sesi (102 baris)"
              >
                <ListFilter size={12} />
                <span>Daftar Terurai</span>
              </button>
            </div>

            {/* Hari filter jika > 1 hari atau jika mode matriks */}
            {availableDays.length > 0 && (
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                {viewMode === 'LIST' && availableDays.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDayKey('ALL')}
                    className={cn(
                      'px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer',
                      selectedDayKey === 'ALL'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs font-black'
                        : 'text-slate-500 hover:text-slate-900'
                    )}
                  >
                    Semua Hari
                  </button>
                )}
                {availableDays.map((d) => {
                  const isSelected =
                    viewMode === 'MATRIX'
                      ? currentMatrixDayKey === d.key
                      : selectedDayKey === d.key;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setSelectedDayKey(d.key)}
                      className={cn(
                        'px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                        isSelected
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs font-black'
                          : 'text-slate-500 hover:text-slate-900'
                      )}
                    >
                      <Calendar size={11} className={isSelected ? 'text-indigo-600' : 'text-slate-400'} />
                      <span>{d.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Status Filter Tabs (Semua, Belum, Terplot) - Ringkas 1 Kata */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={cn(
                  'px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer',
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                Semua ({effectiveJadwalList.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('UNPLOTTED')}
                className={cn(
                  'px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer',
                  statusFilter === 'UNPLOTTED'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                Belum ({effectiveJadwalList.length - workloadStats.totalPlottedSessions})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PLOTTED')}
                className={cn(
                  'px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer',
                  statusFilter === 'PLOTTED'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                Terplot ({workloadStats.totalPlottedSessions})
              </button>
            </div>

            {/* Tingkat Filter Dinamis */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-1">TK:</span>
              {tingkatFilterOptions.map((tk) => (
                <button
                  key={String(tk.val)}
                  type="button"
                  onClick={() => setTingkatFilter(tk.val as any)}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer',
                    tingkatFilter === tk.val
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  {tk.label}
                </button>
              ))}
            </div>

            {/* Sesi Jam Filter jika > 1 dan hanya pada mode LIST */}
            {viewMode === 'LIST' && availableSessions.length > 1 && (
              <select
                value={selectedSessionKey}
                onChange={(e) => setSelectedSessionKey(e.target.value)}
                className="text-xs font-semibold py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs"
              >
                <option value="ALL">Semua Sesi</option>
                {availableSessions.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            )}

            {/* Search Input */}
            <div className="relative w-full sm:w-40 lg:w-44 shrink-0">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ruang/guru..."
                aria-label="Cari ruang atau nama guru"
                className="w-full pl-7 pr-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Right: Actions & Quick Status */}
          <div className="flex items-center gap-1.5 flex-wrap xl:flex-nowrap justify-between xl:justify-end shrink-0">
            {/* Quick Badge Guru Siap */}
            <button
              type="button"
              onClick={() => setShowUnassignedGuruModal(true)}
              className="text-[11px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 cursor-pointer flex items-center gap-1 shrink-0"
              title="Lihat daftar guru yang belum mendapatkan penugasan pengawas"
            >
              <Users size={11} />
              <span>{workloadStats.unassignedTeachers.length} Siap</span>
            </button>

            {/* Bentrok indicator */}
            {conflictJadwalIds.size > 0 ? (
              <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 flex items-center gap-1 shrink-0">
                <AlertTriangle size={11} />
                <span>{conflictJadwalIds.size} Bentrok</span>
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-1 shrink-0">
                <CheckCircle2 size={11} />
                <span>Aman</span>
              </span>
            )}

            {/* Toggle Visibilitas Kolom Proktor */}
            <button
              type="button"
              onClick={() => setIsProctorEnabledLocal(!showProctor)}
              className={cn(
                'text-[11px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 shrink-0',
                showProctor
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800'
                  : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:text-slate-700'
              )}
              title={
                showProctor
                  ? 'Kolom Proktor / Pengawas 2 sedang aktif. Klik untuk menyembunyikan.'
                  : 'Kolom Proktor / Pengawas 2 disembunyikan. Klik untuk menampilkan.'
              }
            >
              <UserCheck size={11} className={showProctor ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{showProctor ? 'Proktor: Aktif' : 'Proktor: Sembunyi'}</span>
            </button>

            {/* Kosongkan Button */}
            {workloadStats.totalPlottedSessions > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={clearPlottingMutation.isPending}
                onClick={handleConfirmClearAllPlotting}
                className="text-xs h-7 px-2 font-bold text-rose-600 border-rose-200 bg-white hover:bg-rose-50 cursor-pointer shadow-2xs shrink-0"
                title="Kosongkan seluruh penugasan pengawas"
              >
                <RotateCcw size={11} className={cn('mr-1', clearPlottingMutation.isPending && 'animate-spin')} />
                <span>Kosongkan</span>
              </Button>
            )}

            {/* Salin Sesi 1 Seharian (Hanya di mode Matriks) */}
            {viewMode === 'MATRIX' && activeDaySessions.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyAllRoomsFullDay}
                className="text-xs h-7 px-2.5 font-bold text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-800/80 dark:bg-amber-950/40 cursor-pointer shadow-2xs shrink-0 flex items-center gap-1"
                title="Salin penugasan Pengawas Sesi 1 ke seluruh sesi berikutnya untuk SEMUA ruang di hari ini"
              >
                <Zap size={11} className="text-amber-600 fill-amber-500" />
                <span>Salin Sesi 1 Seharian</span>
              </Button>
            )}

            {/* Plot Otomatis Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenAutoPlotModal}
              className="text-xs h-7 px-2.5 font-bold text-indigo-700 border-indigo-200 bg-white hover:bg-indigo-50 dark:text-indigo-300 dark:border-indigo-700 dark:bg-slate-900 cursor-pointer shadow-2xs shrink-0"
              title="Distribusi otomatis pengawas menggunakan SOP silang sekolah"
            >
              <Wand2 size={11} className="mr-1 text-indigo-600 dark:text-indigo-400" />
              <span>Plot Otomatis</span>
            </Button>

            {/* Simpan Button */}
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={dirtyPlottingItems.length === 0 || bulkPlottingMutation.isPending}
              onClick={() => bulkPlottingMutation.mutate()}
              className={cn(
                'text-xs h-7 px-2.5 font-bold text-white shadow-2xs cursor-pointer flex items-center gap-1 shrink-0',
                dirtyPlottingItems.length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-slate-300 cursor-not-allowed text-slate-500'
              )}
            >
              <Save size={11} />
              <span>
                {bulkPlottingMutation.isPending ? 'Menyimpan...' : `Simpan (${dirtyPlottingItems.length})`}
              </span>
            </Button>

            {/* Lanjut Button */}
            {onProceedToNextPhase && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onProceedToNextPhase}
                className="text-xs h-7 px-2.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>Lanjut</span>
                <ArrowRight size={11} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. TABEL OPERASIONAL PLOTING PENGAWAS (MATRIKS RUANG ATAU DAFTAR TERURAI) ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        {isLoadingJadwal ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-medium">Memuat data jadwal &amp; plotting pengawas...</p>
          </div>
        ) : viewMode === 'MATRIX' ? (
          /* ── TAMPILAN MATRIKS RUANG × SESI (34 BARIS) ── */
          roomMatrixRows.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Filter size={20} />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Tidak ada ruangan yang cocok dengan filter
              </p>
              <p className="text-xs text-slate-400">
                Coba ganti filter hari, tingkat, atau ubah kata kunci pencarian.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 dark:border-slate-700 text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/95 border-b border-slate-300 dark:border-slate-700 text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    <th className="py-2 px-2.5 text-center w-10 border-r border-slate-200 dark:border-slate-700">No</th>
                    <th className="py-2 px-3 min-w-[130px] border-r border-slate-200 dark:border-slate-700">Ruang &amp; Rombel</th>
                    {activeDaySessions.map((slot) => (
                      <th key={slot.slotKey} className="py-2 px-3 min-w-[260px] border-r border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-black text-slate-800 dark:text-slate-100">
                            {slot.displayTitle}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-semibold">
                            {slot.jamMulai}–{slot.jamSelesai} {tzLabel}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="py-2 px-2 text-center w-28 shrink-0">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/80 font-medium">
                  {roomMatrixRows.map((r, idx) => {
                    const tkMeta = TINGKAT_STYLES[r.tingkat] || TINGKAT_STYLES[10];
                    const sessionsInRoom = Object.values(r.sessions);
                    const hasConflict = sessionsInRoom.some((j) => conflictJadwalIds.has(j.id));
                    const hasDirty = sessionsInRoom.some((j) => plottingDrafts[j.id]?.dirty);
                    const isEven = idx % 2 === 1;

                    // Pewarnaan se-row penuh dari kelas hingga sesi 1-3 (Style Excel Grid)
                    let rowBgClass = '';
                    let borderLeftClass = '';

                    if (hasConflict) {
                      rowBgClass = 'bg-rose-100/70 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60';
                      borderLeftClass = 'border-l-4 border-l-rose-600';
                    } else if (hasDirty) {
                      rowBgClass = 'bg-indigo-100/60 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50';
                      borderLeftClass = 'border-l-4 border-l-indigo-600';
                    } else if (r.tingkat === 10) {
                      // Tingkat X: Nuansa Sky Blue Excel penuh se-row
                      rowBgClass = isEven
                        ? 'bg-sky-100/60 dark:bg-sky-950/50 hover:bg-sky-100/90 dark:hover:bg-sky-900/60'
                        : 'bg-sky-50/50 dark:bg-sky-950/25 hover:bg-sky-100/70 dark:hover:bg-sky-900/40';
                      borderLeftClass = 'border-l-4 border-l-sky-500';
                    } else if (r.tingkat === 11) {
                      // Tingkat XI: Nuansa Emerald Green Excel penuh se-row
                      rowBgClass = isEven
                        ? 'bg-emerald-100/60 dark:bg-emerald-950/50 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/60'
                        : 'bg-emerald-50/50 dark:bg-emerald-950/25 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40';
                      borderLeftClass = 'border-l-4 border-l-emerald-500';
                    } else if (r.tingkat === 12) {
                      // Tingkat XII: Nuansa Amber Gold Excel penuh se-row
                      rowBgClass = isEven
                        ? 'bg-amber-100/60 dark:bg-amber-950/50 hover:bg-amber-100/90 dark:hover:bg-amber-900/60'
                        : 'bg-amber-50/50 dark:bg-amber-950/25 hover:bg-amber-100/70 dark:hover:bg-amber-900/40';
                      borderLeftClass = 'border-l-4 border-l-amber-500';
                    } else {
                      // Tingkat XIII / Lainnya: Nuansa Purple Excel penuh se-row
                      rowBgClass = isEven
                        ? 'bg-purple-100/60 dark:bg-purple-950/50 hover:bg-purple-100/90 dark:hover:bg-purple-900/60'
                        : 'bg-purple-50/50 dark:bg-purple-950/25 hover:bg-purple-100/70 dark:hover:bg-purple-900/40';
                      borderLeftClass = 'border-l-4 border-l-purple-500';
                    }

                    return (
                      <tr
                        key={r.roomCode}
                        className={cn('transition-colors border-b border-slate-200 dark:border-slate-700/80', rowBgClass)}
                      >
                        {/* No */}
                        <td className={cn(
                          'py-1.5 px-2 text-center font-mono text-xs font-black align-middle border-r border-slate-200 dark:border-slate-700/80',
                          borderLeftClass
                        )}>
                          <span className="text-slate-600 dark:text-slate-300">
                            {idx + 1}
                          </span>
                        </td>

                        {/* Ruang & Rombel (Excel Style Ringkas) */}
                        <td className="py-2 px-2.5 align-middle border-r border-slate-200 dark:border-slate-700/80 min-w-[130px]">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenRoomDenah(r.roomCode, `Ploting Ruang: ${r.roomCode}`)}
                              className="px-2 py-0.5 rounded-md border font-mono font-black text-xs inline-flex items-center gap-1 shadow-2xs hover:scale-105 transition-all cursor-pointer bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700"
                              title="Klik untuk melihat posisi ruang di Denah Kampus"
                            >
                              <DoorOpen size={11} className={tkMeta.accent} />
                              <span>{r.roomCode}</span>
                            </button>
                            <span className="font-black text-xs text-slate-900 dark:text-white truncate" title={r.rombel}>
                              {r.rombel}
                            </span>
                          </div>
                        </td>

                        {/* Dynamic Session Columns (Fokus Murni ke Fungsi: Nama Mapel + Dropdown Pengawas) */}
                        {activeDaySessions.map((slot) => {
                          const j = r.sessions[slot.slotKey];
                          if (!j) {
                            return (
                              <td key={slot.slotKey} className="py-2 px-2.5 align-middle border-r border-slate-200 dark:border-slate-700/80 text-center">
                                <span className="text-[10px] text-slate-400 italic">— Tidak Ada Ujian —</span>
                              </td>
                            );
                          }

                          const draft = plottingDrafts[j.id] || {
                            jadwal_id: j.id,
                            ruang_ujian: r.roomCode,
                            pengawas_1_id: j.setting_keamanan?.pengawas_1_id || '',
                            proktor_id: j.setting_keamanan?.proktor_id || j.setting_keamanan?.pengawas_2_id || '',
                            dirty: false,
                          };

                          const isConflict = conflictJadwalIds.has(j.id);
                          const mapelName =
                            j.BankSoal?.Mapel?.nama_mapel ||
                            j.BankSoal?.MataPelajaran?.nama_mapel ||
                            j.BankSoal?.judul ||
                            'Mapel Umum';

                          return (
                            <td key={slot.slotKey} className="py-2 px-2.5 align-middle border-r border-slate-200 dark:border-slate-700/80 min-w-[240px]">
                              <div className="space-y-1.5">
                                {/* Nama Mapel Bersih & Jelas */}
                                <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate leading-tight" title={mapelName}>
                                  {mapelName}
                                </div>

                                {/* Pengawas 1 Dropdown */}
                                <div>
                                  <SearchableSelect
                                    options={pengawasSelectOptions}
                                    value={draft.pengawas_1_id}
                                    onChange={(val) => handleUpdatePlotRow(j.id, 'pengawas_1_id', val)}
                                    placeholder="Pilih Pengawas 1..."
                                    aria-label={`Pengawas 1 ${j.nama_sesi}`}
                                    clearable={true}
                                    triggerClassName="bg-white/95 dark:bg-slate-900/95 text-xs py-1 h-8 rounded-lg border-slate-300 dark:border-slate-700 shadow-2xs font-medium"
                                  />
                                  {isConflict && (
                                    <p className="text-[9px] font-black text-rose-600 mt-0.5 flex items-center gap-0.5">
                                      <AlertTriangle size={10} className="shrink-0" />
                                      <span className="truncate">Bentrok jam di ruang lain!</span>
                                    </p>
                                  )}
                                </div>

                                {/* Proktor / Pengawas 2 (Hanya jika diaktifkan) */}
                                {showProctor && (
                                  <div>
                                    <SearchableSelect
                                      options={pengawasSelectOptions}
                                      value={draft.proktor_id}
                                      onChange={(val) => handleUpdatePlotRow(j.id, 'proktor_id', val)}
                                      placeholder="Opsional (Proktor/P2)..."
                                      aria-label={`Proktor ${j.nama_sesi}`}
                                      clearable={true}
                                      triggerClassName="bg-white/95 dark:bg-slate-900/95 text-xs py-1 h-8 rounded-lg border-slate-300 dark:border-slate-700 shadow-2xs font-medium"
                                    />
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Aksi Cepat Ruang (Excel Compact) */}
                        <td className="py-1.5 px-2 text-center align-middle border-b border-slate-200 dark:border-slate-700/80 w-28 shrink-0">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopyRoomFullDay(r)}
                              className="w-full px-2 py-1 rounded-md text-[10px] font-black bg-amber-500 hover:bg-amber-600 text-white shadow-2xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                              title={`Salin pengawas Sesi 1 ke seluruh sesi berikutnya di ${r.roomCode}`}
                            >
                              <Zap size={11} className="fill-white" />
                              <span>Salin Seharian</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleClearRoomFullDay(r)}
                              className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-0.5 cursor-pointer"
                              title={`Kosongkan pengawas untuk seluruh sesi di ${r.roomCode}`}
                            >
                              <RotateCcw size={9} />
                              <span>Kosongkan</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ── TAMPILAN DAFTAR TERURAI (102 BARIS ORIGINAL) ── */
          sortedAndFilteredJadwal.length === 0 ? (
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
                    <th className="py-2.5 px-3 text-center w-10">No</th>
                    <th className="py-2.5 px-3">Ruang</th>
                    <th className="py-2.5 px-3">Rombel</th>
                    <th className="py-2.5 px-3">Mapel &amp; Sesi</th>
                    <th className="py-2.5 px-3">Waktu</th>
                    <th className="py-2.5 px-3 min-w-[260px]">Pengawas 1</th>
                    {showProctor && (
                      <th className="py-2.5 px-3 min-w-[220px]">Pengawas 2 / Proktor</th>
                    )}
                    <th className="py-2.5 px-3 text-center w-16">Aksi</th>
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

                    const isEven = idx % 2 === 1;
                    const tingkatBorderClass =
                      info.tingkat === 10
                        ? 'border-l-4 border-l-sky-500'
                        : info.tingkat === 11
                        ? 'border-l-4 border-l-emerald-500'
                        : info.tingkat === 12
                        ? 'border-l-4 border-l-amber-500'
                        : 'border-l-4 border-l-purple-500';

                    const rowBgClass = isConflict
                      ? 'bg-rose-50/50 dark:bg-rose-950/20'
                      : draft.dirty
                      ? 'bg-indigo-50/30 dark:bg-indigo-950/20'
                      : isEven
                      ? 'bg-slate-50/80 dark:bg-slate-800/40 hover:bg-indigo-50/40 dark:hover:bg-slate-800/60'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/50';

                    return (
                      <tr
                        key={row.id}
                        className={cn('transition-colors', rowBgClass)}
                      >
                        {/* No dengan Aksen Garis Tingkat */}
                        <td className={cn(
                          'py-2.5 px-3 text-center font-mono text-[11px] align-middle',
                          tingkatBorderClass
                        )}>
                          <span className="font-bold text-slate-500 dark:text-slate-400">
                            {idx + 1}
                          </span>
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

                        {/* Proktor / Pengawas 2 (Hanya jika diaktifkan) */}
                        {showProctor && (
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
                        )}

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
          )
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
          jadwalList={effectiveJadwalList}
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
