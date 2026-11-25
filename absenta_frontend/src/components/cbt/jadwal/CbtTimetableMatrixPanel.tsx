import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui';
import {
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  Layers,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  ArrowRight,
  Save,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtBankSoal, CbtJadwalUjian, CbtEventItem } from '@/types/cbt.types';
import { useJenjang } from '@/hooks/useJenjang';
import { useAuthStore } from '@/store/authStore';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import { resolveBankTingkatNumber, isVocationalSubject } from './cbtJadwalHelper';
import {
  ExamDayConfig,
  ExamSessionSlot,
  KelasRoomMapping,
  TimetableMatrixState,
  MultiJurusanSlotConfig,
  isMultiJurusanSlot,
  parseMultiJurusanSlot,
  serializeMultiJurusanSlot,
  extractAllBankIdsFromMatrixValue,
  buildMassSchedulePayloads,
  createDefaultExamDays,
  groupMappingsByTingkat,
  loadPersistedRoomMappings,
  savePersistedRoomMappings,
  loadPersistedMatrixState,
  savePersistedMatrixState,
  reconstructMatrixFromExistingSchedules,
  getNamaHariIndo,
} from './cbtOrchestratorHelper';
import { CbtMultiJurusanModal, JurusanItem } from './CbtMultiJurusanModal';
import { CbtResetPublishedModal } from './CbtResetPublishedModal';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CbtTimetableMatrixPanelProps {
  topFlightDeck?: React.ReactNode;
  bankList: CbtBankSoal[];
  rawGuruMapel?: any[];
  roomMappings: KelasRoomMapping[];
  activeTpId?: string;
  activeSemId?: string;
  defaultTodayStr: string;
  existingSchedules?: CbtJadwalUjian[];
  onSuccessGenerate?: () => void;
  onProceedToNextPhase?: () => void;
  activeEvent?: CbtEventItem | null;
  eventName?: string;
  targetTingkat?: number[];
}

const getTingkatTheme = (tingkat: number) => {
  switch (tingkat) {
    case 10:
      return {
        badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-700',
        headerBg: 'bg-sky-50/70 dark:bg-sky-950/30 border-r border-sky-100 dark:border-sky-900/40',
        cellBg: 'bg-sky-50/20 dark:bg-sky-950/10 border-r border-sky-100/70 dark:border-sky-900/30',
        selectBorder: 'border-sky-200 dark:border-sky-800 hover:border-sky-400',
        activeSelect: 'bg-sky-50/90 text-sky-950 border-sky-400 dark:bg-sky-950/70 dark:text-sky-100 dark:border-sky-600',
        dot: 'bg-sky-500',
        rombelText: 'text-sky-700 dark:text-sky-300',
      };
    case 11:
      return {
        badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
        headerBg: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-r border-emerald-100 dark:border-emerald-900/40',
        cellBg: 'bg-emerald-50/20 dark:bg-emerald-950/10 border-r border-emerald-100/70 dark:border-emerald-900/30',
        selectBorder: 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400',
        activeSelect: 'bg-emerald-50/90 text-emerald-950 border-emerald-400 dark:bg-emerald-950/70 dark:text-emerald-100 dark:border-emerald-600',
        dot: 'bg-emerald-500',
        rombelText: 'text-emerald-700 dark:text-emerald-300',
      };
    case 12:
      return {
        badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700',
        headerBg: 'bg-amber-50/70 dark:bg-amber-950/30 border-r border-amber-100 dark:border-amber-900/40',
        cellBg: 'bg-amber-50/20 dark:bg-amber-950/10 border-r border-amber-100/70 dark:border-amber-900/30',
        selectBorder: 'border-amber-200 dark:border-amber-800 hover:border-amber-400',
        activeSelect: 'bg-amber-50/90 text-amber-950 border-amber-400 dark:bg-amber-950/70 dark:text-amber-100 dark:border-amber-600',
        dot: 'bg-amber-500',
        rombelText: 'text-amber-700 dark:text-amber-300',
      };
    default:
      return {
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
        headerBg: 'bg-purple-50/70 border-r border-purple-100',
        cellBg: 'bg-purple-50/20 border-r border-purple-100/70',
        selectBorder: 'border-purple-200 hover:border-purple-400',
        activeSelect: 'bg-purple-50 text-purple-950 border-purple-400',
        dot: 'bg-purple-500',
        rombelText: 'text-purple-700',
      };
  }
};

interface Time24InputProps {
  value: string; // "HH:mm"
  onChange: (val: string) => void;
  ariaLabel?: string;
  className?: string;
}

const Time24Input: React.FC<Time24InputProps> = ({ value, onChange, ariaLabel, className }) => {
  const [internalVal, setInternalVal] = useState(value || '07:30');

  useEffect(() => {
    setInternalVal(value || '07:30');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9:]/g, '');
    if (raw.length <= 5) {
      setInternalVal(raw);
    }
  };

  const handleBlur = () => {
    let clean = internalVal.trim();
    if (!clean) {
      clean = value || '07:30';
    }

    if (/^\d{3,4}$/.test(clean)) {
      if (clean.length === 3) clean = `0${clean}`;
      clean = `${clean.slice(0, 2)}:${clean.slice(2, 4)}`;
    }

    const parts = clean.split(':');
    let h = parseInt(parts[0] || '7', 10);
    let m = parseInt(parts[1] || '0', 10);

    if (isNaN(h) || h < 0) h = 0;
    if (h > 23) h = 23;
    if (isNaN(m) || m < 0) m = 0;
    if (m > 59) m = 59;

    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    setInternalVal(formatted);
    if (formatted !== value) {
      onChange(formatted);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={internalVal}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="07:30"
      maxLength={5}
      aria-label={ariaLabel}
      className={cn(
        'w-13 py-1 px-1 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs font-mono font-bold tracking-tight hover:border-indigo-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden transition-colors cursor-text',
        className
      )}
    />
  );
};

export const CbtTimetableMatrixPanel: React.FC<CbtTimetableMatrixPanelProps> = ({
  topFlightDeck,
  bankList,
  rawGuruMapel = [],
  roomMappings,
  activeTpId,
  activeSemId,
  defaultTodayStr,
  existingSchedules,
  onSuccessGenerate,
  onProceedToNextPhase,
  activeEvent,
  eventName,
  targetTingkat,
}) => {
  const queryClient = useQueryClient();
  const { jenjang } = useJenjang();

  const [eventPrefix, setEventPrefix] = useState(() => activeEvent?.nama_event || eventName || 'PSAS Ganjil');
  const [generationMode, setGenerationMode] = useState<'per_rombel_ruang' | 'per_tingkat'>('per_rombel_ruang');
  const [days, setDays] = useState<ExamDayConfig[]>(() => createDefaultExamDays(defaultTodayStr, 5));
  const [matrix, setMatrix] = useState<TimetableMatrixState>({});
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const { user } = useAuthStore();
  const tenantId = user?.tenant_id || 'default';
  const eventId = activeEvent?.id;
  const isInitialLoadedRef = useRef(false);

  // 1. Muat state draft matriks yang tersimpan di database atau localStorage (SSoT Persisten)
  useEffect(() => {
    if (!tenantId) return;

    // A. Baca struktur hari & sesi dari Event Config di DB (Prioritas Tertinggi Server SSoT jika ada), fallback ke localStorage
    const serverDaysConfig = activeEvent?.days_config && Array.isArray(activeEvent.days_config) && activeEvent.days_config.length > 0
      ? activeEvent.days_config.map((d: any) => ({
          ...d,
          nama_hari: getNamaHariIndo(d.tanggal) || d.nama_hari,
        }))
      : null;

    const persisted = loadPersistedMatrixState(tenantId, activeTpId, activeSemId, eventId);
    let effectiveDays =
      serverDaysConfig ||
      (persisted?.days && persisted.days.length > 0
        ? persisted.days.map((d) => ({
            ...d,
            nama_hari: getNamaHariIndo(d.tanggal) || d.nama_hari,
          }))
        : createDefaultExamDays(defaultTodayStr, 5));
    // Prioritaskan draft matriks dari Cloud Server (DB SSoT), fallback ke localStorage
    const serverMatrixDraft = activeEvent?.matrix_draft && typeof activeEvent.matrix_draft === 'object' && Object.keys(activeEvent.matrix_draft).length > 0
      ? activeEvent.matrix_draft
      : null;

    let effectiveMatrix: TimetableMatrixState = serverMatrixDraft
      ? { ...serverMatrixDraft }
      : (persisted?.matrix ? { ...persisted.matrix } : {});

    // B. Rekonstruksi & Sinkronisasi dari Jadwal Database (SSoT Tertinggi jika sudah pernah diterbitkan)
    if (existingSchedules && existingSchedules.length > 0 && bankList.length > 0) {
      const { matrix: dbMatrix, days: dbDays } = reconstructMatrixFromExistingSchedules(
        existingSchedules,
        effectiveDays,
        bankList,
        roomMappings
      );
      if (dbDays && dbDays.length > 0) {
        effectiveDays = dbDays;
      }
      if (Object.keys(dbMatrix).length > 0) {
        const mergedMatrix: TimetableMatrixState = { ...effectiveMatrix };
        Object.entries(dbMatrix).forEach(([k, dbVal]) => {
          const draftVal = mergedMatrix[k];
          if (draftVal && isMultiJurusanSlot(draftVal)) {
            const draftCfg = parseMultiJurusanSlot(draftVal);
            const dbCfg = isMultiJurusanSlot(dbVal) ? parseMultiJurusanSlot(dbVal) : null;
            if (draftCfg && dbCfg) {
              mergedMatrix[k] = serializeMultiJurusanSlot({
                title: draftCfg.title || dbCfg.title,
                assignments: { ...draftCfg.assignments, ...dbCfg.assignments },
              });
            }
            // Jika draft sudah Multi-Jurusan tapi di DB baru terbit 1 jurusan (single val), pertahankan draft
          } else {
            mergedMatrix[k] = dbVal;
          }
        });
        effectiveMatrix = mergedMatrix;
      }
    }

    setDays(effectiveDays);
    setMatrix(effectiveMatrix);
    if (persisted?.eventPrefix) {
      setEventPrefix(persisted.eventPrefix);
    }
    if (persisted?.generationMode) {
      setGenerationMode(persisted.generationMode);
    }
    if (persisted?.savedAt) {
      setLastSavedTime(new Date(persisted.savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    }

    isInitialLoadedRef.current = true;
  }, [tenantId, activeTpId, activeSemId, eventId, existingSchedules, bankList, defaultTodayStr]);

  // 2. Auto-save ke localStorage HANYA setelah initial load selesai (mencegah penimpaan state kosong/bawaan pada mount awal)
  useEffect(() => {
    if (!isInitialLoadedRef.current || !activeTpId) return;
    savePersistedMatrixState(
      { matrix, days, eventPrefix, generationMode },
      tenantId,
      activeTpId,
      activeSemId,
      eventId
    );
    setLastSavedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  }, [matrix, days, eventPrefix, generationMode, tenantId, activeTpId, activeSemId, eventId]);

  const handleResetMatrix = useCallback(() => {
    if (window.confirm('Kosongkan semua pilihan mapel pada matriks?')) {
      setMatrix({});
      savePersistedMatrixState(
        { matrix: {}, days, eventPrefix, generationMode },
        tenantId,
        activeTpId,
        activeSemId,
        eventId
      );
      toast.success('Pilihan mapel pada matriks berhasil dikosongkan.');
    }
  }, [days, eventPrefix, generationMode, tenantId, activeTpId, activeSemId, eventId]);

  const [isSavingTimeConfig, setIsSavingTimeConfig] = useState(false);
  const [isResettingPublished, setIsResettingPublished] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Handler Simpan Format Waktu & Sesi ke Server (Database Event Config)
  const handleSaveTimeConfigToServer = async () => {
    if (!activeEvent?.id) {
      toast.error('Tidak ada Event CBT aktif yang dipilih');
      return;
    }

    try {
      setIsSavingTimeConfig(true);
      toast.loading('Menyimpan format tanggal, jam sesi & rancangan mapel ke server...', { id: 'save-time-config' });
      await cbtApi.upsertEvent({
        id: activeEvent.id,
        nama_event: activeEvent.nama_event,
        kode_event: activeEvent.kode_event,
        tahun_pelajaran_id: activeEvent.tahun_pelajaran_id,
        semester: activeEvent.semester,
        target_tingkat: activeEvent.target_tingkat,
        tipe_pelaksanaan: activeEvent.tipe_pelaksanaan,
        keterangan: activeEvent.keterangan,
        lock_teacher_scheduling: activeEvent.lock_teacher_scheduling,
        token_refresh_interval: activeEvent.token_refresh_interval,
        strict_browser_guard: activeEvent.strict_browser_guard,
        enable_proctor: activeEvent.enable_proctor,
        is_active: activeEvent.is_active ?? true,
        days_config: days,
        room_mappings: activeEvent.room_mappings,
        matrix_draft: matrix,
      });

      // Simpan juga ke local storage sebagai backup draft
      savePersistedMatrixState(
        { matrix, days, eventPrefix, generationMode },
        tenantId,
        activeTpId,
        activeSemId,
        eventId
      );

      toast.success(
        `Jadwal waktu & rancangan sesi (${days.length} hari) berhasil disimpan ke Server! Komputer lain kini langsung tersinkronkan.`,
        { id: 'save-time-config', duration: 4000 }
      );
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.eventsSummary() });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan format waktu sesi ke server', {
        id: 'save-time-config',
      });
    } finally {
      setIsSavingTimeConfig(false);
    }
  };

  // Handler Eksekusi Kosongkan Seluruh Jadwal Sesi CBT yang Sudah Terbit di Database
  const handleExecuteResetPublished = async () => {
    try {
      setIsResettingPublished(true);
      toast.loading('Mengosongkan seluruh sesi jadwal ujian di database...', { id: 'reset-published-scheds' });
      const res = await cbtApi.bulkDeleteJadwal({
        event_id: activeEvent?.id,
        tahun_pelajaran_id: activeTpId,
        semester_id: activeSemId,
        target_tingkat: targetTingkat,
      });

      toast.success(res.message || 'Seluruh sesi jadwal ujian berhasil dikosongkan!', {
        id: 'reset-published-scheds',
        duration: 4000,
      });
      setIsResetModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all });
      if (onSuccessGenerate) onSuccessGenerate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal mengosongkan jadwal ujian', {
        id: 'reset-published-scheds',
      });
    } finally {
      setIsResettingPublished(false);
    }
  };

  // Grouped room mappings by tingkat
  const groupedRoomsByTingkat = useMemo(() => {
    return groupMappingsByTingkat(roomMappings);
  }, [roomMappings]);

  // Jurusan grouped by tingkat (berbasis jurusan_id mutlak dari relasi master Kelas/Jurusan, tanpa parsing nama kelas)
  const jurusansByTingkat = useMemo(() => {
    const map = new Map<number, JurusanItem[]>();

    roomMappings.forEach((m) => {
      const t = m.tingkat;
      if (!map.has(t)) map.set(t, []);
      const list = map.get(t)!;

      const kode = (m.kode_jurusan || m.nama_jurusan || 'UMUM').toUpperCase().trim();
      const absJurId = m.jurusan_id || kode;

      let existing = list.find((j) => j.id === absJurId);
      if (!existing) {
        existing = {
          id: absJurId,
          kode,
          nama: m.nama_jurusan || kode,
          rombelCount: 0,
          rombelNames: [],
        };
        list.push(existing);
      }
      existing.rombelCount++;
      existing.rombelNames.push(m.nama_kelas);
    });

    map.forEach((list) => {
      list.sort((a, b) => a.kode.localeCompare(b.kode));
    });

    return map;
  }, [roomMappings]);

  const activeTingkatList = useMemo(() => {
    if (targetTingkat && targetTingkat.length > 0) {
      return [...targetTingkat].sort((a, b) => a - b);
    }
    return Array.from(groupedRoomsByTingkat.keys()).sort((a, b) => a - b);
  }, [targetTingkat, groupedRoomsByTingkat]);

  // Group bank soals by tingkat
  const banksByTingkat = useMemo(() => {
    const map = new Map<number, CbtBankSoal[]>();
    bankList.forEach((b) => {
      const num = resolveBankTingkatNumber(b);
      if (num !== undefined) {
        if (!map.has(num)) map.set(num, []);
        map.get(num)!.push(b);
      }
    });
    return map;
  }, [bankList]);

  // Unified Subject Options: 1 Mapel = 1 Pilihan Bersih per Tingkat (Tanpa Duplikasi Nama Guru atau Label Bising)
  const subjectOptionsByTingkat = useMemo(() => {
    const map = new Map<
      number,
      Array<{
        id: string;
        mapelId: string;
        tingkat: number;
        guruId?: string;
        namaMapel: string;
        namaGuru?: string;
        soalCount: number;
        isAutoDraft: boolean;
        label: string;
        jurusan?: string | null;
      }>
    >();

    const tempMap = new Map<number, Map<string, any>>();
    [10, 11, 12].forEach((t) => tempMap.set(t, new Map()));

    // 1. HANYA masukkan Bank Soal riil yang sudah dibuat secara sadar oleh guru pengampu di database
    // (Engine pembuatan cangkang draft kosong otomatis oleh panitia telah dihapus agar guru patuh pada indikator)
    bankList.forEach((b) => {
      const num = resolveBankTingkatNumber(b);
      if (num === undefined || !tempMap.has(num)) return;

      const count = b.jumlah_soal || b._count?.Soal || 0;
      const mName = b.Mapel?.nama_mapel || b.MataPelajaran?.nama_mapel || b.judul || 'Mata Pelajaran';
      const jurTag = b.jurusan ? ` [${b.jurusan}]` : '';

      tempMap.get(num)!.set(b.id, {
        id: b.id,
        mapelId: b.mapel_id,
        tingkat: num,
        guruId: b.guru_id,
        namaMapel: mName,
        namaGuru: b.Guru?.nama_guru,
        soalCount: count,
        isAutoDraft: false,
        jurusan: b.jurusan,
        judul: b.judul,
        kodeMapel: b.Mapel?.kode_mapel,
        kelompokMapel: (b.Mapel as any)?.kelompok_mapel,
        label: count > 0 ? `${mName}${jurTag} (${count} Soal)` : `${mName}${jurTag} (0 Soal - Draft)`,
      });
    });

    // 2. Harmonisasikan dengan Kurikulum Resmi Sekolah (rawGuruMapel)
    // Mengadopsi mesin yang sama persis dengan Matriks Kelas Kesiapan Soal:
    // Seluruh mata pelajaran kurikulum (DDPK Fase E Kelas 10, KK/MPP Kelas 11 & 12)
    // yang diajarkan pada tingkat tersebut otomatis didaftarkan ke pilihan helper
    if (rawGuruMapel && Array.isArray(rawGuruMapel)) {
      rawGuruMapel.forEach((gm: any) => {
        const mId = gm.mapel_id;
        if (!mId) return;

        const mapelName = gm.Mapel?.nama_mapel || 'Mata Pelajaran';
        const lowerName = mapelName.toLowerCase();
        // Abaikan BK / BP
        if (
          lowerName.includes('bimbingan') ||
          lowerName.includes('konseling') ||
          lowerName.includes('bp/bk') ||
          lowerName.includes('bk')
        ) {
          return;
        }

        // Deteksi tingkat (persis seperti cbtClassSubjectMatrixHelper.ts)
        const rawTingkat = gm.Kelas?.tingkat || gm.Mapel?.tingkat;
        let tNum = Number(rawTingkat);
        if (!tNum && gm.Kelas?.nama_kelas) {
          const match = gm.Kelas.nama_kelas.match(/\b(X|XI|XII|10|11|12)\b/i);
          if (match) {
            const roman = match[1].toUpperCase();
            tNum = roman === 'XI' || roman === '11' ? 11 : roman === 'XII' || roman === '12' ? 12 : 10;
          }
        }

        const targetTingkats: number[] = [];
        if (tNum && tempMap.has(tNum)) {
          targetTingkats.push(tNum);
        } else {
          const upper = mapelName.toUpperCase();
          if (upper.includes('DDPK') || upper.includes('DASAR') || upper.includes('FASE E')) {
            targetTingkats.push(10);
          } else if (
            upper.includes('KONSENTRASI') ||
            upper.includes('FASE F') ||
            upper.startsWith('KK ') ||
            upper.startsWith('MPP ')
          ) {
            targetTingkats.push(11, 12);
          } else {
            const fallback = rawTingkat === 'XI' ? 11 : rawTingkat === 'XII' ? 12 : 10;
            if (tempMap.has(fallback)) targetTingkats.push(fallback);
          }
        }

        // Deteksi Jurusan (persis seperti cbtClassSubjectMatrixHelper.ts)
        let jurKode =
          (gm.Jurusan as any)?.kode ||
          (gm.Jurusan as any)?.singkatan ||
          (gm.Kelas as any)?.Jurusan?.kode;
        const kName = gm.Kelas?.nama_kelas || '';
        if (!jurKode && kName) {
          const match = kName.match(/\b(AKL|AK|TKJ|TKR|TSM|TP|TM|KUL|PHT|HTL|TOI|TAV|TE|TO)\b/i);
          if (match) {
            jurKode = match[1].toUpperCase();
          }
        }
        if (!jurKode) {
          const upper = mapelName.toUpperCase();
          if (upper.includes('AKL') || upper.includes('AKUNTANSI') || /\bAK\b/.test(upper)) jurKode = 'AKL';
          else if (upper.includes('KUL') || upper.includes('BOGA') || upper.includes('KULINER')) jurKode = 'KUL';
          else if (upper.includes('PHT') || upper.includes('HOTEL') || /\bHTL\b/.test(upper) || upper.includes('PERHOTELAN')) jurKode = 'PHT';
          else if (upper.includes('TAV') || upper.includes('AUDIO VIDEO')) jurKode = 'TAV';
          else if (upper.includes('TOI') || upper.includes('OTOMASI')) jurKode = 'TOI';
          else if (upper.includes('TKJ') || upper.includes('TJKT') || upper.includes('JARINGAN')) jurKode = 'TKJ';
          else if (upper.includes('TKR') || upper.includes('KENDARAAN') || upper.includes('OTOMOTIF')) jurKode = 'TKR';
          else if (upper.includes('TSM') || upper.includes('SEPEDA MOTOR') || /\bMOTOR\b/.test(upper)) jurKode = 'TSM';
          else if (upper.includes('TM') || upper.includes('TP') || upper.includes('PEMESINAN') || /\bMESIN\b/.test(upper)) jurKode = 'TP';
        }

        targetTingkats.forEach((tingkatNum) => {
          if (!tempMap.has(tingkatNum)) return;
          const existingEntries = Array.from(tempMap.get(tingkatNum)!.values());

          // Cek apakah mapel dengan jurusan terkait sudah ada Bank Soal riil
          const hasExistingBank = existingEntries.some((entry) => {
            if (entry.mapelId !== mId) return false;
            if (jurKode && entry.jurusan) {
              const entryJurUpper = entry.jurusan.toUpperCase();
              return entryJurUpper.includes(jurKode.toUpperCase()) || jurKode.toUpperCase().includes(entryJurUpper);
            }
            return !entry.isAutoDraft;
          });

          // Jika belum ada Bank Soal di database, daftarkan cangkang kurikulum resmi (0 Soal)
          if (!hasExistingBank) {
            const draftKey = `draft_${mId}_${jurKode || 'all'}`;
            if (!tempMap.get(tingkatNum)!.has(draftKey)) {
              const jurTag = jurKode ? ` [${jurKode}]` : '';
              tempMap.get(tingkatNum)!.set(draftKey, {
                id: draftKey,
                mapelId: mId,
                tingkat: tingkatNum,
                guruId: gm.guru_id,
                namaMapel: mapelName,
                namaGuru: gm.Guru?.nama_guru,
                soalCount: 0,
                isAutoDraft: true,
                jurusan: jurKode || null,
                judul: mapelName,
                kodeMapel: gm.Mapel?.kode_mapel,
                kelompokMapel: (gm.Mapel as any)?.kelompok_mapel,
                label: `${mapelName}${jurTag} (0 Soal - Belum Dibuat Guru)`,
              });
            }
          }
        });
      });
    }

    // Convert tempMap ke array dan urutkan: Mapel siap soal di atas, lalu abjad ASC
    tempMap.forEach((entryMap, tNum) => {
      const items = Array.from(entryMap.values());
      items.sort((a, b) => {
        if (a.soalCount > 0 && b.soalCount === 0) return -1;
        if (a.soalCount === 0 && b.soalCount > 0) return 1;
        return a.namaMapel.localeCompare(b.namaMapel);
      });
      map.set(tNum, items);
    });

    return map;
  }, [bankList, rawGuruMapel]);

  // Unified Main Subject Options (Luar Modal):
  // 1 MATA PELAJARAN = 1 OPSI BERSIH (Key & Value: MAPEL_ID)
  // Menjaga tabel slot utama tetap bersih & ringkas dengan hanya menampilkan Mapel Umum Serentak
  // (Pecahan bank soal guru disatukan ke induk Mapel, sedangkan kejuruan diplot via slot Multi-Jurusan)
  const mainSubjectOptionsByTingkat = useMemo(() => {
    const map = new Map<
      number,
      Array<{
        id: string; // MAPEL_ID!
        mapelId: string;
        tingkat: number;
        namaMapel: string;
        soalCount: number;
        bankCount: number;
        isAutoDraft: boolean;
        label: string;
      }>
    >();

    [10, 11, 12].forEach((t) => {
      const subjectGroupMap = new Map<
        string,
        {
          mapelId: string;
          tingkat: number;
          namaMapel: string;
          totalSoal: number;
          banks: CbtBankSoal[];
          kelompokMapel?: string;
        }
      >();

      // 1. Ekstrak dari rawGuruMapel (Kurikulum resmi sekolah)
      if (rawGuruMapel && Array.isArray(rawGuruMapel)) {
        rawGuruMapel.forEach((gm: any) => {
          const mId = gm.mapel_id;
          if (!mId) return;

          const mapelName = gm.Mapel?.nama_mapel || 'Mata Pelajaran';
          const lowerName = mapelName.toLowerCase();
          if (
            lowerName.includes('bimbingan') ||
            lowerName.includes('konseling') ||
            lowerName.includes('bp/bk') ||
            lowerName.includes('bk')
          ) {
            return;
          }

          // Deteksi apakah diajarkan di tingkat t
          const rawTingkat = gm.Kelas?.tingkat || gm.Mapel?.tingkat;
          let tNum = Number(rawTingkat);
          if (!tNum && gm.Kelas?.nama_kelas) {
            const match = gm.Kelas.nama_kelas.match(/\b(X|XI|XII|10|11|12)\b/i);
            if (match) {
              const roman = match[1].toUpperCase();
              tNum = roman === 'XI' || roman === '11' ? 11 : roman === 'XII' || roman === '12' ? 12 : 10;
            }
          }

          let isMatchTingkat = tNum === t;
          if (!isMatchTingkat) {
            const upper = mapelName.toUpperCase();
            if ((upper.includes('DDPK') || upper.includes('DASAR')) && t === 10) isMatchTingkat = true;
            else if ((upper.startsWith('KK ') || upper.startsWith('MPP ')) && (t === 11 || t === 12)) isMatchTingkat = true;
            else if (!tNum && rawTingkat === (t === 11 ? 'XI' : t === 12 ? 'XII' : 'X')) isMatchTingkat = true;
          }

          if (isMatchTingkat && !subjectGroupMap.has(mId)) {
            subjectGroupMap.set(mId, {
              mapelId: mId,
              tingkat: t,
              namaMapel: mapelName,
              totalSoal: 0,
              banks: [],
              kelompokMapel: gm.Mapel?.kelompok_mapel,
            });
          }
        });
      }

      // 2. Hubungkan dengan bankList untuk menghitung total soal & bank soal
      bankList.forEach((b) => {
        const bTingkat = resolveBankTingkatNumber(b);
        if (bTingkat !== t) return;
        const mId = b.mapel_id;
        if (!mId) return;

        const mName = b.Mapel?.nama_mapel || b.MataPelajaran?.nama_mapel || b.judul || 'Mata Pelajaran';
        if (!subjectGroupMap.has(mId)) {
          subjectGroupMap.set(mId, {
            mapelId: mId,
            tingkat: t,
            namaMapel: mName,
            totalSoal: 0,
            banks: [],
            kelompokMapel: (b.Mapel as any)?.kelompok_mapel,
          });
        }

        const entry = subjectGroupMap.get(mId)!;
        entry.banks.push(b);
        entry.totalSoal += b.jumlah_soal || b._count?.Soal || 0;
      });

      // 3. Filter mapel umum (sembunyikan kejuruan karena kejuruan menggunakan Multi-Jurusan)
      const list: Array<{
        id: string;
        mapelId: string;
        tingkat: number;
        namaMapel: string;
        soalCount: number;
        bankCount: number;
        isAutoDraft: boolean;
        label: string;
      }> = [];

      subjectGroupMap.forEach((entry) => {
        if (isVocationalSubject(entry.namaMapel, entry.kelompokMapel)) {
          return;
        }

        const bankCount = entry.banks.length;
        const totalSoal = entry.totalSoal;
        const isDraft = bankCount === 0 || totalSoal === 0;

        let statusText = '';
        if (totalSoal > 0) {
          statusText = bankCount > 1 ? `(${totalSoal} Soal - ${bankCount} Bank)` : `(${totalSoal} Soal)`;
        } else {
          statusText = `(0 Soal - Belum Disetor)`;
        }

        list.push({
          id: entry.mapelId, // PENTING: Value adalah mapel_id!
          mapelId: entry.mapelId,
          tingkat: t,
          namaMapel: entry.namaMapel,
          soalCount: totalSoal,
          bankCount: bankCount,
          isAutoDraft: isDraft,
          label: `${entry.namaMapel} ${statusText}`,
        });
      });

      // Urutkan: Siap soal di atas, lalu abjad ASC
      list.sort((a, b) => {
        if (a.soalCount > 0 && b.soalCount === 0) return -1;
        if (a.soalCount === 0 && b.soalCount > 0) return 1;
        return a.namaMapel.localeCompare(b.namaMapel);
      });

      map.set(t, list);
    });

    return map;
  }, [bankList, rawGuruMapel]);

  // Map bank_soal_id ke daftar sesi ujian yang sudah ada di database (untuk Idempotensi & On-Demand)
  const publishedSessionsByBankId = useMemo(() => {
    const map = new Map<string, CbtJadwalUjian[]>();
    if (!existingSchedules) return map;
    existingSchedules.forEach((j) => {
      if (j.bank_soal_id) {
        if (!map.has(j.bank_soal_id)) map.set(j.bank_soal_id, []);
        map.get(j.bank_soal_id)!.push(j);
      }
    });
    return map;
  }, [existingSchedules]);

  // Map mapel_id ke daftar sesi ujian yang sudah ada di database
  const publishedSessionsByMapelId = useMemo(() => {
    const map = new Map<string, CbtJadwalUjian[]>();
    if (!existingSchedules) return map;
    const bankMap = new Map(bankList.map((b) => [b.id, b]));

    existingSchedules.forEach((j) => {
      const bank = bankMap.get(j.bank_soal_id);
      const mId = bank?.mapel_id || (j.BankSoal as any)?.mapel_id;
      if (mId) {
        if (!map.has(mId)) map.set(mId, []);
        map.get(mId)!.push(j);
      }
    });
    return map;
  }, [existingSchedules, bankList]);

  // Kumpulan ID mapel/bank yang sedang terpasang di dalam slot matriks DIPISAH PER TINGKAT
  // (PENTING: Mapel Kelas 10 yang sudah di-plot TIDAK BOLEH memblokir Kelas 11 atau Kelas 12!)
  const usedSubjectIdsByTingkat = useMemo(() => {
    const map = new Map<number, Set<string>>();
    [10, 11, 12].forEach((t) => map.set(t, new Set<string>()));

    Object.entries(matrix).forEach(([key, rawVal]) => {
      if (!rawVal) return;
      // Key format: `${dayIndex}_${sessionIndex}_${tingkat}`
      const parts = key.split('_');
      const tNum = Number(parts[2]);
      if (!tNum || !map.has(tNum)) return;

      const set = map.get(tNum)!;

      extractAllBankIdsFromMatrixValue(rawVal).forEach((id) => {
        set.add(id);
        const b = bankList.find((bank) => bank.id === id);
        if (b?.mapel_id) set.add(b.mapel_id);
      });

      if (rawVal && !rawVal.startsWith('{') && !rawVal.includes('__MULTI_JURUSAN__')) {
        set.add(rawVal);
        const b = bankList.find((bank) => bank.id === rawVal);
        if (b?.mapel_id) set.add(b.mapel_id);
      }
    });

    return map;
  }, [matrix, bankList]);

  // State Modal Konfigurasi Multi-Jurusan (DDPK / Produktif)
  const [multiModalState, setMultiModalState] = useState<{
    isOpen: boolean;
    dayIndex: number;
    dayName: string;
    sessionIndex: number;
    sessionName: string;
    tingkat: number;
    initialConfig?: MultiJurusanSlotConfig | null;
  } | null>(null);

  const handleOpenMultiModal = (dayIdx: number, sessIdx: number, tingkat: number) => {
    const key = `${dayIdx}_${sessIdx}_${tingkat}`;
    const currentVal = matrix[key];
    const parsed = parseMultiJurusanSlot(currentVal);
    const day = days.find((d) => d.day_index === dayIdx);
    const sess = day?.sessions.find((s) => s.session_index === sessIdx);

    setMultiModalState({
      isOpen: true,
      dayIndex: dayIdx,
      dayName: day?.nama_hari || `Hari ${dayIdx}`,
      sessionIndex: sessIdx,
      sessionName: sess?.nama_sesi || `Sesi ${sessIdx}`,
      tingkat,
      initialConfig: parsed,
    });
  };

  const handleSaveMultiJurusan = (config: MultiJurusanSlotConfig) => {
    if (!multiModalState) return;
    const key = `${multiModalState.dayIndex}_${multiModalState.sessionIndex}_${multiModalState.tingkat}`;
    const serialized = serializeMultiJurusanSlot(config);
    setMatrix((prev) => ({
      ...prev,
      [key]: serialized,
    }));
  };

  const handleSelectBankSoal = (dayIdx: number, sessIdx: number, tingkat: number, bankId: string) => {
    const key = `${dayIdx}_${sessIdx}_${tingkat}`;
    if (bankId === '__MULTI_JURUSAN__') {
      handleOpenMultiModal(dayIdx, sessIdx, tingkat);
      return;
    }

    setMatrix((prev) => {
      if (!bankId) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: bankId };
    });
  };

  const handleUpdateDayDate = (dayIdx: number, newDate: string) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_index !== dayIdx) return d;
        const computedDayName = getNamaHariIndo(newDate) || d.nama_hari;
        return { ...d, tanggal: newDate, nama_hari: computedDayName };
      })
    );
  };

  // Helper kalkulasi durasi menit dan penambahan waktu
  const calculateDurationMinutes = (start: string, end: string): number => {
    if (!start || !end) return 90;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 90;
    const diff = eh * 60 + em - (sh * 60 + sm);
    return diff > 0 ? diff : 90;
  };

  const addMinutesToTime = (time: string, minutes: number): string => {
    const [h, m] = (time || '07:30').split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '09:00';
    const total = h * 60 + m + minutes;
    const newH = Math.floor(total / 60) % 24;
    const newM = total % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  // Handler Update Jam Slot / Nama Sesi
  const handleUpdateSessionTime = (
    dayIdx: number,
    sessIdx: number,
    field: 'jam_mulai' | 'jam_selesai' | 'nama_sesi' | 'durasi_menit',
    value: string | number
  ) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_index !== dayIdx) return d;
        const updatedSessions = d.sessions.map((s) => {
          if (s.session_index !== sessIdx) return s;

          if (field === 'jam_mulai') {
            const newStart = String(value);
            const currentDur = s.durasi_menit || 60;
            const autoEnd = addMinutesToTime(newStart, currentDur);
            return {
              ...s,
              jam_mulai: newStart,
              jam_selesai: autoEnd,
              durasi_menit: currentDur,
            };
          }

          if (field === 'jam_selesai') {
            const newEnd = String(value);
            const dur = calculateDurationMinutes(s.jam_mulai, newEnd);
            return {
              ...s,
              jam_selesai: newEnd,
              durasi_menit: dur,
            };
          }

          if (field === 'durasi_menit') {
            const numDur = Math.max(15, Number(value) || 60);
            const autoEnd = addMinutesToTime(s.jam_mulai, numDur);
            return {
              ...s,
              durasi_menit: numDur,
              jam_selesai: autoEnd,
            };
          }

          if (field === 'nama_sesi') {
            return { ...s, nama_sesi: String(value) };
          }

          return s;
        });

        return { ...d, sessions: updatedSessions };
      })
    );
  };

  // Terapkan Jam Sesi Tertentu ke Seluruh Hari Ujian
  const handleApplySessionTimeToAllDays = (sourceSess: ExamSessionSlot) => {
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        sessions: d.sessions.map((s) =>
          s.session_index === sourceSess.session_index
            ? {
                ...s,
                nama_sesi: sourceSess.nama_sesi,
                jam_mulai: sourceSess.jam_mulai,
                jam_selesai: sourceSess.jam_selesai,
                durasi_menit: sourceSess.durasi_menit,
              }
            : s
        ),
      }))
    );
    toast.success(`Jam ${sourceSess.nama_sesi} (${sourceSess.jam_mulai} - ${sourceSess.jam_selesai}) berhasil disalin ke semua hari ujian!`);
  };

  // Tambah Slot Sesi pada Hari Tertentu
  const handleAddSessionToDay = (dayIdx: number) => {
    setDays((prev) =>
      prev.map((d) => {
        if (d.day_index !== dayIdx) return d;
        const lastSess = d.sessions[d.sessions.length - 1];
        const nextIdx = (lastSess?.session_index || 0) + 1;
        const defaultStart = lastSess ? addMinutesToTime(lastSess.jam_selesai, 30) : '07:30';
        const defaultEnd = addMinutesToTime(defaultStart, 60);

        const newSession: ExamSessionSlot = {
          session_index: nextIdx,
          nama_sesi: `Sesi ${nextIdx}`,
          jam_mulai: defaultStart,
          jam_selesai: defaultEnd,
          durasi_menit: 60,
        };

        return {
          ...d,
          sessions: [...d.sessions, newSession],
        };
      })
    );
    toast.success(`Slot sesi baru ditambahkan ke Hari ke-${dayIdx}`);
  };

  // Tambah Slot Sesi Serentak ke Semua Hari
  const handleAddSessionToAllDays = () => {
    setDays((prev) => {
      const maxSessionIdx = Math.max(
        0,
        ...prev.flatMap((d) => d.sessions.map((s) => s.session_index))
      );
      const nextIdx = maxSessionIdx + 1;

      return prev.map((d) => {
        const lastSess = d.sessions[d.sessions.length - 1];
        const defaultStart = lastSess ? addMinutesToTime(lastSess.jam_selesai, 30) : '07:30';
        const defaultEnd = addMinutesToTime(defaultStart, 60);

        const newSession: ExamSessionSlot = {
          session_index: nextIdx,
          nama_sesi: `Sesi ${nextIdx}`,
          jam_mulai: defaultStart,
          jam_selesai: defaultEnd,
          durasi_menit: 60,
        };

        return {
          ...d,
          sessions: [...d.sessions, newSession],
        };
      });
    });
    toast.success('Slot sesi baru berhasil ditambahkan ke seluruh hari ujian!');
  };

  // Hapus Slot Sesi dari Hari Tertentu
  const handleRemoveSessionFromDay = (dayIdx: number, sessIdx: number) => {
    const targetDay = days.find((d) => d.day_index === dayIdx);
    if (!targetDay) return;
    if (targetDay.sessions.length <= 1) {
      toast.error('Minimal harus ada 1 sesi ujian dalam 1 hari');
      return;
    }

    // Bersihkan key matrix untuk slot sesi yang dihapus
    setMatrix((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${dayIdx}_${sessIdx}_`)) {
          delete next[key];
        }
      });
      return next;
    });

    setDays((prev) =>
      prev.map((d) =>
        d.day_index === dayIdx
          ? { ...d, sessions: d.sessions.filter((s) => s.session_index !== sessIdx) }
          : d
      )
    );
    toast.success('Slot sesi berhasil dihapus');
  };

  const handleAddDay = () => {
    setDays((prev) => {
      const last = prev[prev.length - 1];
      const nextDate = last
        ? new Date(new Date(last.tanggal).getTime() + 86400000 * (new Date(last.tanggal).getDay() === 5 ? 3 : 1))
        : new Date();
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dt = String(nextDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dt}`;

      return [
        ...prev,
        {
          day_index: prev.length + 1,
          nama_hari: getNamaHariIndo(dateStr) || `Hari ke-${prev.length + 1}`,
          tanggal: dateStr,
          sessions: last?.sessions || [
            { session_index: 1, nama_sesi: 'Sesi 1', jam_mulai: '07:30', jam_selesai: '08:30', durasi_menit: 60 },
            { session_index: 2, nama_sesi: 'Sesi 2', jam_mulai: '09:00', jam_selesai: '10:00', durasi_menit: 60 },
          ],
        },
      ];
    });
  };

  const handleRemoveDay = (dayIdx: number) => {
    if (days.length <= 1) {
      toast.error('Minimal harus ada 1 hari pelaksanaan ujian');
      return;
    }
    setDays((prev) => prev.filter((d) => d.day_index !== dayIdx));
  };

  // Hitung perkiraan jadwal yang akan di-generate
  const totalSlotsFilled = useMemo(() => Object.keys(matrix).length, [matrix]);

  // Hitung jadwal baru vs jadwal yang sudah pernah diterbitkan (100% sinkron dengan buildMassSchedulePayloads)
  const { newGeneratedCount, alreadyPublishedCount } = useMemo(() => {
    let newCount = 0;
    let publishedCount = 0;
    const bankMapLocal = new Map(bankList.map((b) => [b.id, b]));

    days.forEach((day) => {
      day.sessions.forEach((session) => {
        Array.from(groupedRoomsByTingkat.keys()).forEach((tingkat) => {
          if (targetTingkat && targetTingkat.length > 0 && !targetTingkat.includes(tingkat)) {
            return;
          }

          const key = `${day.day_index}_${session.session_index}_${tingkat}`;
          const val = matrix[key];
          if (!val) return;

          const classesInTingkat = groupedRoomsByTingkat.get(tingkat) || [];
          if (classesInTingkat.length === 0) return;

          if (isMultiJurusanSlot(val)) {
            const multiConfig = parseMultiJurusanSlot(val);
            const assignments = multiConfig?.assignments || {};

            classesInTingkat.forEach((cls) => {
              const assignedBankId =
                (cls.jurusan_id && assignments[cls.jurusan_id]) ||
                (cls.kode_jurusan && assignments[cls.kode_jurusan]);
              if (!assignedBankId || !bankMapLocal.has(assignedBankId)) return;

              const isPublished = (publishedSessionsByBankId.get(assignedBankId)?.length || 0) > 0;
              if (isPublished) {
                publishedCount += 1;
              } else {
                newCount += 1;
              }
            });
          } else {
            const directBank = bankMapLocal.get(val);
            const targetMapelId = directBank?.mapel_id || val;
            const candidateBanks = bankList.filter((b) => {
              if (b.mapel_id !== targetMapelId) return false;
              const bTingkat = resolveBankTingkatNumber(b);
              if (bTingkat !== undefined && bTingkat !== tingkat) return false;
              return true;
            });

            if (candidateBanks.length === 0 && !directBank) return;

            const rombelCount = generationMode === 'per_tingkat' ? 1 : classesInTingkat.length;
            const isPublished =
              (directBank && (publishedSessionsByBankId.get(directBank.id)?.length || 0) > 0) ||
              candidateBanks.some((b) => (publishedSessionsByBankId.get(b.id)?.length || 0) > 0);
            if (isPublished) {
              publishedCount += rombelCount;
            } else {
              newCount += rombelCount;
            }
          }
        });
      });
    });

    return { newGeneratedCount: newCount, alreadyPublishedCount: publishedCount };
  }, [days, matrix, bankList, generationMode, groupedRoomsByTingkat, publishedSessionsByBankId, targetTingkat]);

  const estimatedGeneratedCount = useMemo(() => {
    return newGeneratedCount + alreadyPublishedCount;
  }, [newGeneratedCount, alreadyPublishedCount]);

  // Bulk Create Mutation (Hanya menerbitkan jadwal untuk Bank Soal yang telah dibuat secara sah oleh guru)
  const bulkCreateMutation = useMutation({
    mutationFn: async () => {
      if (!activeTpId || !activeSemId) {
        throw new Error('Tahun Pelajaran atau Semester aktif tidak ditemukan');
      }
      if (totalSlotsFilled === 0) {
        throw new Error('Belum ada mata pelajaran/bank soal yang dipilih di dalam matriks hari ujian');
      }

      const effectiveBankList = [...bankList];
      const effectiveMatrix = { ...matrix };

      let effectiveRoomMappings = [...(roomMappings || [])];
      const persistedRooms = loadPersistedRoomMappings(tenantId, eventId);
      if (persistedRooms && Object.keys(persistedRooms).length > 0) {
        if (effectiveRoomMappings.length === 0) {
          effectiveRoomMappings = Object.entries(persistedRooms).map(([kId, val]) => ({
            kelas_id: kId,
            nama_kelas: (val as any).nama_kelas || 'Kelas',
            tingkat: (val as any).tingkat || 10,
            slot_ruang: val.slot_ruang,
            nama_ruang: val.nama_ruang,
          }));
        } else {
          effectiveRoomMappings = effectiveRoomMappings.map((m) => {
            const p = persistedRooms[m.kelas_id];
            if (p) {
              return {
                ...m,
                slot_ruang: p.slot_ruang || m.slot_ruang,
                nama_ruang: p.nama_ruang || m.nama_ruang,
              };
            }
            return m;
          });
        }
      }

      const payloads = buildMassSchedulePayloads({
        eventPrefix,
        days,
        matrix: effectiveMatrix,
        bankList: effectiveBankList,
        rawGuruMapel,
        roomMappings: effectiveRoomMappings,
        activeTpId,
        activeSemId,
        generationMode,
        tokenRefreshInterval: activeEvent?.token_refresh_interval ?? 0,
        strictBrowserGuard: activeEvent?.strict_browser_guard ?? true,
        eventId: activeEvent?.id,
        targetTingkat,
      });

      if (payloads.length === 0) {
        throw new Error('Tidak ada jadwal ujian yang berhasil dirangkai');
      }

      return cbtApi.bulkCreateJadwal(payloads);
    },
    onSuccess: async (res) => {
      const parts: string[] = [];
      if (res?.created_count) parts.push(`${res.created_count} jadwal baru`);
      if (res?.updated_count) parts.push(`${res.updated_count} jadwal diperbarui`);

      if (parts.length > 0) {
        const skippedText = res?.skipped_count ? ` (${res.skipped_count} jadwal sudah sesuai)` : '';
        toast.success(`Berhasil memproses: ${parts.join(', ')}!${skippedText}`);
      } else if ((res?.skipped_count || 0) > 0) {
        toast.success(res.message || 'Semua jadwal yang dipilih sudah sesuai di database (aman & idempoten).');
      } else {
        toast.success('Jadwal ujian berhasil diproses');
      }
      await queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false, refetchType: 'all' });
      if (onSuccessGenerate) onSuccessGenerate();
    },
    onError: (err: any) => {
      toast.dismiss('auto-provision-bank');
      toast.error(err.response?.data?.message || err.message || 'Gagal menerbitkan jadwal ujian massal');
    },
  });

  return (
    <div className="space-y-3 w-full max-w-full min-w-0">
      {/* ── 1 RUANG SEAMLESS FLIGHT DECK + TOOLBAR ── */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
        {topFlightDeck}

        {/* ── Single-Row Unified Master Filter & Action Toolbar (1 Ruang, Zero Waste Vertical) ── */}
        <div className="p-2 sm:p-2.5 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col xl:flex-row xl:items-center justify-between gap-2">
          {/* Left: Matriks Indicator + Autosave Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              <Calendar size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span>{days.length} Hari Ujian</span>
            </span>

            {/* Autosave Status */}
            {lastSavedTime && (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/60 shrink-0">
                <CheckCircle2 size={11} />
                <span>Tersimpan ({lastSavedTime})</span>
              </span>
            )}
          </div>

          {/* Right: Actions (Tambah Hari, Simpan Format Waktu, Kosongkan, Terbitkan, Lanjut) */}
          <div className="flex items-center gap-1.5 flex-wrap xl:flex-nowrap justify-between xl:justify-end shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddDay}
              className="text-xs h-7 px-2 font-bold text-indigo-700 border-indigo-300 bg-white hover:bg-indigo-50 cursor-pointer shadow-2xs shrink-0"
              title="Tambah hari pelaksanaan ujian baru"
            >
              <Plus size={11} className="mr-1 text-indigo-600" />
              <span>Tambah Hari</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSavingTimeConfig}
              onClick={handleSaveTimeConfigToServer}
              className="text-xs h-7 px-2.5 font-bold text-emerald-700 dark:text-emerald-300 border-emerald-400 dark:border-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 cursor-pointer shadow-2xs shrink-0 flex items-center gap-1"
              title="Simpan struktur tanggal dan jam sesi ke Server Database (tanpa harus menunggu mapel di-plot)"
            >
              <Save size={11} className="text-emerald-600 dark:text-emerald-400" />
              <span>{isSavingTimeConfig ? 'Menyimpan...' : 'Simpan Waktu & Sesi'}</span>
            </Button>

            {totalSlotsFilled > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetMatrix}
                className="text-xs h-7 px-2 font-bold text-slate-600 border-slate-300 bg-white hover:bg-slate-50 cursor-pointer shadow-2xs shrink-0"
                title="Kosongkan pilihan mata pelajaran di matriks layar"
              >
                <RotateCcw size={11} className="mr-1" />
                <span>Kosongkan</span>
              </Button>
            )}

            {alreadyPublishedCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isResettingPublished}
                onClick={() => setIsResetModalOpen(true)}
                className="text-xs h-7 px-2 font-bold text-rose-600 border-rose-300 bg-white hover:bg-rose-50 cursor-pointer shadow-2xs shrink-0 flex items-center gap-1"
                title="Pratinjau dampak & kosongkan seluruh sesi ujian yang sudah terbit di database"
              >
                <Trash2 size={11} className="text-rose-600" />
                <span>{isResettingPublished ? 'Mengosongkan...' : `Kosongkan Sesi Terbit (${alreadyPublishedCount})`}</span>
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => bulkCreateMutation.mutate()}
              disabled={bulkCreateMutation.isPending || totalSlotsFilled === 0}
              className={cn(
                'text-xs h-7 px-2.5 font-bold text-white shadow-2xs cursor-pointer flex items-center gap-1 shrink-0',
                totalSlotsFilled > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-slate-300 cursor-not-allowed text-slate-500'
              )}
            >
              <Sparkles size={11} />
              <span>
                {bulkCreateMutation.isPending ? 'Menerbitkan...' : `Terbitkan (${estimatedGeneratedCount})`}
              </span>
            </Button>

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

      {/* Grid Matriks Hari & Sesi */}
      <div className="space-y-3">
        {days.map((day) => (
          <div
            key={day.day_index}
            className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs"
          >
            {/* Header Hari */}
            <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-bold bg-indigo-50 text-indigo-700 border-indigo-200 text-xs py-0.5 px-2">
                  {day.nama_hari} (Hari {day.day_index})
                </Badge>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-semibold">Tanggal:</span>
                  <input
                    type="date"
                    value={day.tanggal}
                    onChange={(e) => handleUpdateDayDate(day.day_index, e.target.value)}
                    aria-label={`Tanggal untuk ${day.nama_hari}`}
                    className="px-2 py-0.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">
                  {day.sessions.length} Sesi Terjadwal
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveDay(day.day_index)}
                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                  title="Hapus hari ujian ini"
                  aria-label="Hapus hari ujian ini"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Matrix Table Sesi x Tingkat (Format Spreadsheet Excel Clean & Tabular) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs border border-slate-300 dark:border-slate-700">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700 divide-x divide-slate-300 dark:divide-slate-700 uppercase tracking-wider">
                    <th className="py-2 px-3 w-20 text-center">Sesi</th>
                    <th className="py-2 px-3 w-40 text-center">Waktu Ujian</th>
                    <th className="py-2 px-2 w-20 text-center">Durasi</th>
                    {activeTingkatList.map((tingkat) => {
                      const slottedCount = Object.keys(matrix).filter(
                        (k) => k.endsWith(`_${tingkat}`) && Boolean(matrix[k])
                      ).length;
                      const mainOptions = mainSubjectOptionsByTingkat.get(tingkat) || [];
                      const hasVocationalInTingkat = (subjectOptionsByTingkat.get(tingkat) || []).some(
                        (o) => isVocationalSubject(o.namaMapel, (o as any).kelompokMapel) || o.isAutoDraft
                      );
                      const totalSubjects = mainOptions.length + (hasVocationalInTingkat ? 1 : 0);
                      const displayPlotted = Math.min(slottedCount, totalSubjects);
                      const theme = getTingkatTheme(tingkat);

                      return (
                        <th
                          key={tingkat}
                          className={cn('py-2 px-3 min-w-[240px]', theme.headerBg)}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              <span className={cn('w-2 h-2 rounded-full', theme.dot)} />
                              <span>Kelas {tingkat}</span>
                            </span>
                            <div className="flex items-center gap-2 text-[11px] normal-case font-semibold">
                              <span className="text-slate-500 dark:text-slate-400">
                                {groupedRoomsByTingkat.get(tingkat)?.length || 0} Rombel
                              </span>
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-[10px] font-bold',
                                  slottedCount >= totalSubjects && totalSubjects > 0
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                )}
                              >
                                {displayPlotted}/{totalSubjects} Terplot
                              </span>
                            </div>
                          </div>
                        </th>
                      );
                    })}
                    <th className="py-2 px-2 w-20 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/80">
                  {day.sessions.map((sess) => (
                    <tr
                      key={sess.session_index}
                      className="divide-x divide-slate-200 dark:divide-slate-700/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Kolom 1: Sesi */}
                      <td className="py-2 px-2 text-center align-middle bg-slate-50/50 dark:bg-slate-900/40">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          Sesi {sess.session_index}
                        </span>
                      </td>

                      {/* Kolom 2: Waktu Ujian (Inline Mono Time Range 24-Jam Terstandarisasi) */}
                      <td className="py-2 px-2 text-center align-middle bg-slate-50/30 dark:bg-slate-900/30">
                        <div className="inline-flex items-center justify-center gap-1 font-mono text-xs font-bold text-slate-800 dark:text-slate-100">
                          <Time24Input
                            value={sess.jam_mulai}
                            onChange={(val) =>
                              handleUpdateSessionTime(day.day_index, sess.session_index, 'jam_mulai', val)
                            }
                            ariaLabel={`Jam Mulai ${sess.nama_sesi}`}
                          />
                          <span className="text-slate-400 font-sans font-bold">–</span>
                          <Time24Input
                            value={sess.jam_selesai}
                            onChange={(val) =>
                              handleUpdateSessionTime(day.day_index, sess.session_index, 'jam_selesai', val)
                            }
                            ariaLabel={`Jam Selesai ${sess.nama_sesi}`}
                          />
                        </div>
                      </td>

                      {/* Kolom 3: Durasi */}
                      <td className="py-2 px-2 text-center align-middle bg-slate-50/30 dark:bg-slate-900/30">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {sess.durasi_menit} mnt
                        </span>
                      </td>

                      {/* Kolom Mapel per Tingkat */}
                      {activeTingkatList.map((tingkat) => {
                        const matrixKey = `${day.day_index}_${sess.session_index}_${tingkat}`;
                        const selectedBankId = matrix[matrixKey] || '';
                        const allOptionsForTingkat = mainSubjectOptionsByTingkat.get(tingkat) || [];
                        const jurusansForTingkat = jurusansByTingkat.get(tingkat) || [];
                        const theme = getTingkatTheme(tingkat);

                        const isMulti = isMultiJurusanSlot(selectedBankId);
                        const multiConfig = isMulti ? parseMultiJurusanSlot(selectedBankId) : null;
                        const assignedJurusanCount = isMulti && multiConfig
                          ? jurusansForTingkat.filter((j) =>
                              Boolean(multiConfig.assignments[j.id] || multiConfig.assignments[j.kode])
                            ).length
                          : 0;

                        if (isMulti) {
                          return (
                            <td key={tingkat} className={cn('p-1.5 align-middle transition-colors', theme.cellBg)}>
                              <div className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-purple-50/80 dark:bg-purple-950/40 p-2 space-y-1.5 shadow-2xs">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className="font-bold text-xs text-purple-950 dark:text-purple-200 flex items-center gap-1 truncate"
                                    title={multiConfig?.title || 'DDPK Kejuruan'}
                                  >
                                    <Sparkles size={12} className="text-purple-600 dark:text-purple-400 shrink-0" />
                                    <span className="truncate">{multiConfig?.title || 'DDPK Kejuruan'}</span>
                                  </span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-200 text-purple-800 dark:bg-purple-900/80 dark:text-purple-300 shrink-0">
                                    {assignedJurusanCount}/{jurusansForTingkat.length} Jurusan
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenMultiModal(day.day_index, sess.session_index, tingkat)}
                                    className="flex-1 h-6 px-2 text-[10px] font-bold rounded bg-purple-600 hover:bg-purple-700 text-white cursor-pointer transition-colors shadow-2xs flex items-center justify-center gap-1"
                                  >
                                    <span>Atur Paket Jurusan</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectBankSoal(day.day_index, sess.session_index, tingkat, '')}
                                    title="Kosongkan slot sesi ini"
                                    className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </td>
                          );
                        }

                        const usedInThisTingkat = usedSubjectIdsByTingkat.get(tingkat) || new Set<string>();

                        const availableOptions = allOptionsForTingkat.filter((opt) => {
                          if (opt.id === selectedBankId || opt.mapelId === selectedBankId) return true;
                          if (usedInThisTingkat.has(opt.id) || usedInThisTingkat.has(opt.mapelId)) return false;
                          return true;
                        });

                        // Backward-compatibility: jika slot matriks menyimpan bank_soal_id lama
                        let selectedOpt = allOptionsForTingkat.find(
                          (o) => o.id === selectedBankId || o.mapelId === selectedBankId
                        );
                        if (!selectedOpt && selectedBankId) {
                          const matchingBank = bankList.find((b) => b.id === selectedBankId);
                          if (matchingBank?.mapel_id) {
                            selectedOpt = allOptionsForTingkat.find((o) => o.mapelId === matchingBank.mapel_id);
                          }
                        }

                        // Jika slot sudah terisi bank soal tertentu dari opsi lengkap (misal bank soal kejuruan spesifik),
                        // pastikan opsi tersebut tetap ada di dropdown agar value dan labelnya tidak hilang
                        if (selectedBankId && !availableOptions.some((o) => o.id === (selectedOpt?.id || selectedBankId))) {
                          const currentSelectedOpt =
                            selectedOpt ||
                            (subjectOptionsByTingkat.get(tingkat)?.find((o) => o.id === selectedBankId) as any);
                          if (currentSelectedOpt) {
                            availableOptions.unshift(currentSelectedOpt);
                          }
                        }

                        const isZeroQuestions = Boolean(selectedOpt && selectedOpt.soalCount === 0);
                        const publishedCount =
                          (publishedSessionsByMapelId.get(selectedOpt?.mapelId || selectedBankId)?.length || 0) ||
                          (publishedSessionsByBankId.get(selectedBankId)?.length || 0);

                        const isAllPlotted =
                          !selectedBankId && availableOptions.length === 0 && allOptionsForTingkat.length > 0;

                        const readyOptions = availableOptions.filter((opt) => (opt.soalCount || 0) > 0);
                        const emptyOptions = availableOptions.filter((opt) => (opt.soalCount || 0) === 0);

                        return (
                          <td key={tingkat} className={cn('p-2 align-middle transition-colors', theme.cellBg)}>
                            <select
                              value={selectedOpt?.id || selectedBankId}
                              onChange={(e) =>
                                handleSelectBankSoal(day.day_index, sess.session_index, tingkat, e.target.value)
                              }
                              aria-label={`Mata Pelajaran ${day.nama_hari} Sesi ${sess.session_index} Tingkat ${tingkat}`}
                              disabled={isAllPlotted}
                              className={cn(
                                'w-full h-8 px-2.5 text-xs rounded-md border font-medium transition-all cursor-pointer',
                                selectedBankId
                                  ? isZeroQuestions
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 border-amber-400 dark:border-amber-600 font-semibold shadow-2xs'
                                    : publishedCount > 0
                                    ? 'bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 border-emerald-500 dark:border-emerald-600 font-bold shadow-2xs'
                                    : 'bg-emerald-50/40 dark:bg-slate-900 text-emerald-950 dark:text-emerald-100 border-emerald-400 dark:border-emerald-500 font-semibold shadow-2xs'
                                  : isAllPlotted
                                  ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                              )}
                            >
                              <option value="">
                                {isAllPlotted
                                  ? '— Semua Mapel Sudah Terplot —'
                                  : '— Pilih Mata Pelajaran —'}
                              </option>
                              <option value="__MULTI_JURUSAN__" className="font-bold text-purple-700 bg-purple-50 dark:bg-purple-950 dark:text-purple-300">
                                ⚡ [Multi-Jurusan] Paket {tingkat === 10 ? 'DDPK' : 'MPP / Produktif'} per Jurusan...
                              </option>
                              {readyOptions.length > 0 && (
                                <optgroup label="✅ MAPEL SIAP UJIAN (SOAL TERSEDIA)" className="font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50/30 dark:bg-slate-900">
                                  {readyOptions.map((opt) => (
                                    <option key={opt.id} value={opt.id} className="font-semibold text-emerald-950 dark:text-emerald-200">
                                      🟢 {opt.label}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {emptyOptions.length > 0 && (
                                <optgroup label="⚠️ BELUM DISETOR GURU (0 SOAL)" className="font-bold text-amber-700 dark:text-amber-400 bg-amber-50/30 dark:bg-slate-900">
                                  {emptyOptions.map((opt) => (
                                    <option key={opt.id} value={opt.id} className="font-medium text-amber-700 dark:text-amber-300 italic">
                                      ⏳ {opt.label}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>

                            {selectedBankId && (
                              <div className="mt-1 flex items-center justify-between text-[10px] px-0.5">
                                {isZeroQuestions ? (
                                  <span
                                    className="text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 shadow-2xs"
                                    title="Mata pelajaran ini belum memiliki butir soal dari guru pengampu (menunggu guru membuat bank soal)"
                                  >
                                    ⚠️ Menunggu Setoran Guru (0 Soal)
                                  </span>
                                ) : publishedCount > 0 ? (
                                  <>
                                    <span className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                                      <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" /> Terbit ({publishedCount} Ruang)
                                    </span>
                                    <span className="text-emerald-600 dark:text-emerald-400 text-[9px] font-semibold">Idempoten ✓</span>
                                  </>
                                ) : (
                                  <span className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1 bg-emerald-50/70 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                                    <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" /> Siap Terbit ({selectedOpt?.soalCount || 0} Soal)
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Kolom Aksi */}
                      <td className="py-2 px-1 text-center align-middle bg-slate-50/50 dark:bg-slate-900/40">
                        <div className="inline-flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleApplySessionTimeToAllDays(sess)}
                            title="Terapkan jam sesi ini ke seluruh hari ujian"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors cursor-pointer"
                            aria-label="Salin jam ke semua hari"
                          >
                            <Layers size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSessionFromDay(day.day_index, sess.session_index)}
                            title="Hapus baris sesi ini"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                            aria-label="Hapus sesi"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sub-Footer Spreadsheet */}
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-300 dark:border-slate-700 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => handleAddSessionToDay(day.day_index)}
                  className="text-xs h-7 px-2.5 font-bold border-slate-300 dark:border-slate-600 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer shadow-2xs"
                >
                  <Plus size={12} className="mr-1" />
                  <span>Tambah Sesi ({day.nama_hari})</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleAddSessionToAllDays}
                  className="text-xs h-7 px-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
                >
                  <Layers size={12} className="mr-1" />
                  <span>Tambah Sesi ke Semua Hari</span>
                </Button>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {day.sessions.length} Baris Sesi Terjadwal
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddDay}
            className="text-xs h-9 px-3 font-bold border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50 cursor-pointer"
          >
            <Plus size={14} className="mr-1" />
            <span>Tambah Hari Ujian</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSessionToAllDays}
            className="text-xs h-9 px-3 font-bold border-slate-300 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            <Layers size={14} className="mr-1" />
            <span>Tambah Slot Sesi ke Semua Hari</span>
          </Button>

          <div className="text-xs text-slate-600 dark:text-slate-300">
            {newGeneratedCount > 0 ? (
              <span>
                <strong className="text-indigo-600 dark:text-indigo-400 font-black">{newGeneratedCount}</strong> jadwal baru siap diterbitkan
                {alreadyPublishedCount > 0 && (
                  <span className="text-emerald-700 dark:text-emerald-400 ml-1 font-semibold">
                    ({alreadyPublishedCount} jadwal lama akan disinkronkan/diperbarui)
                  </span>
                )}
              </span>
            ) : alreadyPublishedCount > 0 ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 size={14} /> Seluruh {alreadyPublishedCount} jadwal aktif di matriks (Klik untuk sinkronkan perubahan jam/slot)
              </span>
            ) : (
              <span>Pilih mata pelajaran pada slot matriks di atas untuk memulai</span>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={totalSlotsFilled === 0 || bulkCreateMutation.isPending}
          onClick={() => bulkCreateMutation.mutate()}
          className={cn(
            'text-xs h-9 px-5 font-bold shadow-2xs transition-all cursor-pointer',
            newGeneratedCount === 0 && alreadyPublishedCount > 0
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          )}
        >
          {bulkCreateMutation.isPending ? (
            'Menerbitkan...'
          ) : newGeneratedCount > 0 ? (
            <>
              <Sparkles size={14} className="mr-1.5" />
              <span>
                Terbitkan {newGeneratedCount} Jadwal Baru
                {alreadyPublishedCount > 0 ? ` & Sinkronkan (${alreadyPublishedCount})` : ''}
              </span>
            </>
          ) : alreadyPublishedCount > 0 ? (
            <>
              <CheckCircle2 size={14} className="mr-1.5" />
              <span>Sinkronkan / Perbarui Jam ({alreadyPublishedCount} Jadwal)</span>
            </>
          ) : (
            <>
              <Sparkles size={14} className="mr-1.5" />
              <span>Terbitkan 0 Jadwal</span>
            </>
          )}
        </Button>
      </div>

      {/* Modal Dialog Konfigurasi Paket Kejuruan per Jurusan (SMK Serentak) */}
      {multiModalState && (
        <CbtMultiJurusanModal
          isOpen={multiModalState.isOpen}
          onClose={() => setMultiModalState(null)}
          dayIndex={multiModalState.dayIndex}
          dayName={multiModalState.dayName}
          sessionIndex={multiModalState.sessionIndex}
          sessionName={multiModalState.sessionName}
          tingkat={multiModalState.tingkat}
          jurusans={jurusansByTingkat.get(multiModalState.tingkat) || []}
          subjectOptions={subjectOptionsByTingkat.get(multiModalState.tingkat) || []}
          initialConfig={multiModalState.initialConfig}
          onSave={handleSaveMultiJurusan}
        />
      )}

      {/* Modal Dialog Pratinjau Dampak & Konfirmasi Kosongkan Sesi Terbit */}
      <CbtResetPublishedModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleExecuteResetPublished}
        isResetting={isResettingPublished}
        schedules={existingSchedules || []}
        eventName={eventName || activeEvent?.nama_event}
        roomMappings={roomMappings}
      />
    </div>
  );
};
