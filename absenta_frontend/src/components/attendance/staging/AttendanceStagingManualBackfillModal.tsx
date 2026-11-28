import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Users,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Shield,
  Layers,
  ArrowRight,
  ArrowLeft,
  X,
  FileCheck,
  Table,
  Check,
  Search,
  Lock,
  Unlock,
  ShieldAlert,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCapabilities } from '@/hooks/useCapabilities';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'react-hot-toast';
import {
  attendanceStagingApi,
  type ManualBackfillException,
  type ClassStudentOption,
} from '@/api/attendance-staging.api';

export interface AttendanceStagingManualBackfillModalProps {
  isOpen: boolean;
  onClose: () => void;
  classOptions?: Array<{ id: string; nama_kelas: string; tingkat: number; jurusan_nama?: string }>;
  onSuccess: () => void;
  defaultAgendaMode?: AgendaMode;
}

type AgendaMode = 'AUTO_SIKLUS' | 'KETARUNAAN' | 'UPACARA' | 'DUHA' | 'APEL_SORE' | 'ALL_SIKLUS';

const HARI_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];

function formatTanggalIndo(dStr: string) {
  if (!dStr) return '-';
  const d = new Date(`${dStr}T00:00:00Z`);
  const dayName = HARI_NAMES[d.getUTCDay()];
  const dateFormatted = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `${dayName}, ${dateFormatted}`;
}

export const AttendanceStagingManualBackfillModal: React.FC<AttendanceStagingManualBackfillModalProps> = React.memo(({
  isOpen,
  onClose,
  classOptions: externalClassOptions,
  onSuccess,
  defaultAgendaMode = 'AUTO_SIKLUS',
}) => {
  const queryClient = useQueryClient();
  const { isAdmin } = useCapabilities();
  const [internalClassOptions, setInternalClassOptions] = useState<Array<{ id: string; nama_kelas: string; tingkat: number; jurusan_nama?: string }>>([]);
  const [isTogglingGuard, setIsTogglingGuard] = useState(false);
  const [studentChecklistSearch, setStudentChecklistSearch] = useState('');

  const classOptions = useMemo(
    () => (externalClassOptions && externalClassOptions.length > 0 ? externalClassOptions : internalClassOptions),
    [externalClassOptions, internalClassOptions]
  );

  // Auto-load classOptions if not passed from parent
  useEffect(() => {
    if (isOpen && (!externalClassOptions || externalClassOptions.length === 0) && internalClassOptions.length === 0) {
      attendanceStagingApi.getClassOptions().then((res) => {
        if (res.success) {
          setInternalClassOptions(res.data || []);
        }
      }).catch(() => {});
    }
  }, [isOpen, externalClassOptions, internalClassOptions.length]);

  // Query Guard Status
  const { data: guardRes, isLoading: isGuardLoading, refetch: refetchStagingGuard } = useQuery({
    queryKey: ['attendance-staging-guard'],
    queryFn: () => attendanceStagingApi.getGuardStatus(),
    enabled: isOpen,
    staleTime: 30_000,
  });

  const guardStatus = guardRes?.data;
  const isGuardEnabled = Boolean(guardStatus?.enabled);

  const handleToggleGuard = async (nextEnabled: boolean) => {
    setIsTogglingGuard(true);
    try {
      const res = await attendanceStagingApi.updateGuardStatus({
        enabled: nextEnabled,
      });
      if (res.success) {
        toast.success(res.message);
        await refetchStagingGuard();
        queryClient.invalidateQueries({ queryKey: ['attendance-staging-guard'] });
        queryClient.invalidateQueries({ queryKey: ['tenant-info'] });
      } else {
        toast.error(res.message || 'Gagal memperbarui status Guard.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal memperbarui status Guard.');
    } finally {
      setIsTogglingGuard(false);
    }
  };

  // ── WIZARD STEP: 1 = Konfigurasi, 2 = Input Siswa Non-Hadir, 3 = Review Matriks ──
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // ── Step 1: Multi-Tanggal State ──
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [includeSunday, setIncludeSunday] = useState<boolean>(false);
  const [singleDateInput, setSingleDateInput] = useState<string>('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // ── Step 1: Agenda & Target Kelas ──
  const [agendaMode, setAgendaMode] = useState<AgendaMode>(defaultAgendaMode);
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>([]);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [directSync, setDirectSync] = useState<boolean>(true);

  // ── Step 2: Exception Input (Siswa Non-Hadir) ──
  const [activeFilterKelasId, setActiveFilterKelasId] = useState<string>('');
  const [classStudentsMap, setClassStudentsMap] = useState<Record<string, ClassStudentOption[]>>({});
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [exceptionStatus, setExceptionStatus] = useState<'SAKIT' | 'IZIN' | 'ALPA' | 'DISPENSASI' | 'TERLAMBAT'>('SAKIT');
  const [exceptionScope, setExceptionScope] = useState<'ALL_DATES' | 'CUSTOM'>('ALL_DATES');
  const [exceptionCustomDates, setExceptionCustomDates] = useState<string[]>([]);
  const [exceptionNotes, setExceptionNotes] = useState<string>('');
  const [lateMinutes, setLateMinutes] = useState<number>(15);

  const [exceptionsList, setExceptionsList] = useState<ManualBackfillException[]>([]);
  const [activeBrushStatus, setActiveBrushStatus] = useState<'SAKIT' | 'IZIN' | 'ALPA' | 'TERLAMBAT' | 'DISPENSASI'>('SAKIT');
  const [existingDbSessionsByKelas, setExistingDbSessionsByKelas] = useState<Record<string, string[]>>({});
  const [dbRecheckStats, setDbRecheckStats] = useState<{ totalExistingSessions: number; totalExistingRecords: number }>({
    totalExistingSessions: 0,
    totalExistingRecords: 0,
  });
  const [isLoadingDbMatrix, setIsLoadingDbMatrix] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ── Step 3: Preview State ──
  const [previewKelasId, setPreviewKelasId] = useState<string>('');
  const [previewSearchStudent, setPreviewSearchStudent] = useState<string>('');

  // Auto-select 20 Rombel Kelas X saat modal pertama dibuka
  useEffect(() => {
    if (isOpen && classOptions.length > 0 && selectedKelasIds.length === 0) {
      const kelasX = classOptions.filter(
        (c) => c.tingkat === 10 || c.nama_kelas.toUpperCase().startsWith('X ')
      );
      if (kelasX.length > 0) {
        const xIds = kelasX.map((c) => c.id);
        setSelectedKelasIds(xIds);
        setActiveFilterKelasId(xIds[0]);
        setPreviewKelasId(xIds[0]);
      }
    }
  }, [isOpen, classOptions, selectedKelasIds.length]);

  // Fetch siswa saat kelas terpilih berubah
  const fetchStudentsForClass = useCallback((kId: string) => {
    if (!kId || classStudentsMap[kId]) return;
    setLoadingStudents(true);
    attendanceStagingApi
      .getClassStudents(kId)
      .then((res) => {
        if (res.success) {
          setClassStudentsMap((prev) => ({ ...prev, [kId]: res.data || [] }));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch class students:', err);
      })
      .finally(() => {
        setLoadingStudents(false);
      });
  }, [classStudentsMap]);

  useEffect(() => {
    if (!isOpen || selectedKelasIds.length === 0) return;
    const kelasToFetch = activeFilterKelasId || previewKelasId || selectedKelasIds[0];
    if (kelasToFetch) {
      fetchStudentsForClass(kelasToFetch);
    }
  }, [isOpen, activeFilterKelasId, previewKelasId, selectedKelasIds, fetchStudentsForClass]);

  // Handler: Generate Tanggal dari Rentang
  const handleGenerateDateRange = () => {
    if (!dateRangeStart || !dateRangeEnd) {
      toast.error('Mohon pilih tanggal mulai dan tanggal selesai');
      return;
    }
    const start = new Date(`${dateRangeStart}T00:00:00Z`);
    const end = new Date(`${dateRangeEnd}T00:00:00Z`);

    if (start > end) {
      toast.error('Tanggal mulai tidak boleh lebih besar dari tanggal selesai');
      return;
    }

    const generated: string[] = [];
    const cur = new Date(start.getTime());

    while (cur <= end) {
      const dayNum = cur.getUTCDay();
      if (includeSunday || dayNum !== 0) {
        generated.push(cur.toISOString().slice(0, 10));
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    const merged = Array.from(new Set([...selectedDates, ...generated])).sort();
    setSelectedDates(merged);
    toast.success(`Berhasil menambahkan ${generated.length} tanggal pelaksanaan.`);
  };

  // Handler: Tambah Tanggal Tunggal
  const handleAddSingleDate = () => {
    if (!singleDateInput) return;
    if (selectedDates.includes(singleDateInput)) {
      toast.error('Tanggal ini sudah ada dalam daftar.');
      return;
    }
    const updated = [...selectedDates, singleDateInput].sort();
    setSelectedDates(updated);
    setSingleDateInput('');
  };

  // Handler: Hapus Tanggal dari Chip
  const handleRemoveDate = (dStr: string) => {
    setSelectedDates(selectedDates.filter((d) => d !== dStr));
    setExceptionCustomDates((prev) => prev.filter((d) => d !== dStr));
  };

  // Handler: Quick Select Rombel
  const handleSelectKelasX = () => {
    const xList = classOptions
      .filter((c) => c.tingkat === 10 || c.nama_kelas.toUpperCase().startsWith('X '))
      .map((c) => c.id);
    setSelectedKelasIds(xList);
    if (xList.length > 0) {
      setActiveFilterKelasId(xList[0]);
      setPreviewKelasId(xList[0]);
    }
    toast.success(`Dipilih ${xList.length} Rombel Kelas X.`);
  };

  const handleSelectAllKelas = () => {
    const all = classOptions.map((c) => c.id);
    setSelectedKelasIds(all);
    if (all.length > 0) {
      setActiveFilterKelasId(all[0]);
      setPreviewKelasId(all[0]);
    }
    toast.success(`Dipilih seluruh ${all.length} Rombel Kelas.`);
  };

  const handleClearKelas = () => {
    setSelectedKelasIds([]);
  };

  // Siswa yang tersedia untuk dipilih di dropdown
  const currentAvailableStudents = useMemo(() => {
    const kId = activeFilterKelasId || selectedKelasIds[0];
    return classStudentsMap[kId] || [];
  }, [activeFilterKelasId, selectedKelasIds, classStudentsMap]);

  // Handler: Tambah Siswa Non-Hadir (Pengecualian)
  const handleAddException = () => {
    if (!selectedStudentId) {
      toast.error('Mohon pilih siswa yang tidak hadir');
      return;
    }
    if (selectedDates.length === 0) {
      toast.error('Mohon tentukan tanggal presensi terlebih dahulu');
      return;
    }

    const st = currentAvailableStudents.find((s) => s.siswa_id === selectedStudentId);
    if (!st) {
      toast.error('Data siswa tidak ditemukan');
      return;
    }

    const kId = activeFilterKelasId || selectedKelasIds[0];
    const kObj = classOptions.find((c) => c.id === kId);

    const datesForThisException =
      exceptionScope === 'ALL_DATES' || exceptionCustomDates.length === 0
        ? undefined
        : exceptionCustomDates;

    const exists = exceptionsList.some(
      (e) => e.siswa_id === st.siswa_id && JSON.stringify(e.dates) === JSON.stringify(datesForThisException)
    );
    if (exists) {
      toast.error('Siswa ini sudah ada dalam daftar pengecualian dengan tanggal yang sama.');
      return;
    }

    const newEx: ManualBackfillException = {
      siswa_id: st.siswa_id,
      nama_siswa: st.nama_siswa,
      nis: st.nis,
      nama_kelas: kObj?.nama_kelas || '',
      status: exceptionStatus,
      dates: datesForThisException,
      catatan: exceptionNotes.trim() || undefined,
      menit_keterlambatan: exceptionStatus === 'TERLAMBAT' ? lateMinutes : undefined,
    };

    setExceptionsList((prev) => [newEx, ...prev]);
    toast.success(`Siswa ${st.nama_siswa} dicatat [${exceptionStatus}]. Siswa lainnya tetap HADIR.`);

    setSelectedStudentId('');
    setExceptionNotes('');
  };

  // Handler: Hapus Siswa dari Daftar Pengecualian
  const handleRemoveException = (index: number) => {
    setExceptionsList((prev) => prev.filter((_, idx) => idx !== index));
  };

  // ── Sesi yang Terbentuk Sesuai Mode Agenda & Tanggal ──
  const generatedSessions = useMemo(() => {
    const list: Array<{
      dateIso: string;
      dateFormatted: string;
      dayName: string;
      sessionCode: string;
      sessionLabel: string;
      defaultType: 'UPACARA' | 'KETARUNAAN' | 'DUHA' | 'APEL_SORE';
    }> = [];

    const sorted = [...new Set(selectedDates)].sort();
    for (const dStr of sorted) {
      const d = new Date(`${dStr}T00:00:00Z`);
      const dayNum = d.getUTCDay();
      const dayName = HARI_NAMES[dayNum];
      const shortDate = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', timeZone: 'UTC' });

      if (agendaMode === 'AUTO_SIKLUS') {
        if (dayNum === 1) {
          list.push({ dateIso: dStr, dateFormatted: shortDate, dayName, sessionCode: 'PAGI', sessionLabel: 'Upacara', defaultType: 'UPACARA' });
        } else if (dayNum === 5) {
          list.push({ dateIso: dStr, dateFormatted: shortDate, dayName, sessionCode: 'PAGI', sessionLabel: 'Dhuha', defaultType: 'DUHA' });
        } else if (dayNum >= 2 && dayNum <= 6) {
          list.push({ dateIso: dStr, dateFormatted: shortDate, dayName, sessionCode: 'PAGI', sessionLabel: 'Ketarunaan', defaultType: 'KETARUNAAN' });
        }
        if (dayNum >= 1 && dayNum <= 6) {
          list.push({ dateIso: dStr, dateFormatted: shortDate, dayName, sessionCode: 'SORE', sessionLabel: 'Apel Sore', defaultType: 'APEL_SORE' });
        }
      } else if (agendaMode === 'ALL_SIKLUS') {
        const pagiType = dayNum === 1 ? 'UPACARA' : dayNum === 5 ? 'DUHA' : 'KETARUNAAN';
        const pagiLabel = dayNum === 1 ? 'Upacara' : dayNum === 5 ? 'Dhuha' : 'Ketarunaan';
        list.push({ dateIso: dStr, dateFormatted: shortDate, dayName, sessionCode: 'PAGI', sessionLabel: pagiLabel, defaultType: pagiType });
        list.push({ dateIso: dStr, dateFormatted: shortDate, dayName, sessionCode: 'SORE', sessionLabel: 'Apel Sore', defaultType: 'APEL_SORE' });
      } else if (agendaMode === 'KETARUNAAN') {
        list.push({ dateIso: dStr, dateFormatted: shortDate, dayName, sessionCode: 'PAGI', sessionLabel: 'Ketarunaan', defaultType: 'KETARUNAAN' });
      } else if (agendaMode === 'UPACARA') {
        list.push({ dateIso: dStr, dateFormatted: shortDate, dayName, sessionCode: 'PAGI', sessionLabel: 'Upacara', defaultType: 'UPACARA' });
      } else if (agendaMode === 'DUHA') {
        list.push({ dateIso: dStr, dateFormatted: shortDate, dayName, sessionCode: 'PAGI', sessionLabel: 'Dhuha', defaultType: 'DUHA' });
      } else if (agendaMode === 'APEL_SORE') {
        list.push({ dateIso: dStr, dateFormatted: shortDate, dayName, sessionCode: 'SORE', sessionLabel: 'Apel Sore', defaultType: 'APEL_SORE' });
      }
    }
    return list;
  }, [selectedDates, agendaMode]);

  // Perkiraan total siswa
  const estimatedTotalStudents = useMemo(() => {
    return selectedKelasIds.length * 36;
  }, [selectedKelasIds.length]);

  // Siswa kelas yang sedang dilihat matriks pratinjaunya
  const activePreviewClassId = previewKelasId || selectedKelasIds[0] || '';
  const previewClassStudents = useMemo(() => {
    return classStudentsMap[activePreviewClassId] || [];
  }, [activePreviewClassId, classStudentsMap]);

  // Filter siswa dalam tabel preview
  const filteredPreviewStudents = useMemo(() => {
    if (!previewSearchStudent.trim()) return previewClassStudents;
    const q = previewSearchStudent.trim().toLowerCase();
    return previewClassStudents.filter(
      (s) => s.nama_siswa.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q)
    );
  }, [previewClassStudents, previewSearchStudent]);

  // Helper status per cell di matriks preview & matriks ceklis (mendukung key sesi YYYY-MM-DD_PAGI / YYYY-MM-DD_SORE maupun tanggal YYYY-MM-DD)
  const getStudentSessionStatus = useCallback((siswaId: string, sess: typeof generatedSessions[0]): {
    status: 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA' | 'DISPENSASI' | 'TERLAMBAT';
    isException: boolean;
  } => {
    const sessKey = `${sess.dateIso}_${sess.sessionCode}`;
    const matched = exceptionsList.find((ex) => {
      if (ex.siswa_id !== siswaId) return false;
      if (!ex.dates || ex.dates.length === 0) return true;
      return ex.dates.includes(sessKey) || ex.dates.includes(sess.dateIso);
    });
    if (matched) {
      return { status: matched.status, isException: true };
    }
    return { status: 'HADIR', isException: false };
  }, [exceptionsList]);

  // Handler Submit Utama: Generate Backfill
  const handleSubmitGenerate = async () => {
    if (selectedDates.length === 0) {
      toast.error('Mohon tentukan minimal 1 tanggal presensi.');
      return;
    }
    if (selectedKelasIds.length === 0) {
      toast.error('Mohon pilih minimal 1 rombel kelas sasaran.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await attendanceStagingApi.createManualBackfill({
        file_title: customTitle.trim() || undefined,
        dates: selectedDates,
        kelas_ids: selectedKelasIds,
        jenis_kegiatan_mode: agendaMode,
        exceptions: exceptionsList,
        direct_sync: directSync,
      });

      if (res.success) {
        toast.success(res.message || 'Backfill presensi manual berhasil dibuat!');
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Gagal memproses backfill.');
      }
    } catch (err: any) {
      console.error('Failed to create manual backfill:', err);
      toast.error(err.response?.data?.message || err.message || 'Gagal membuat backfill presensi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigasi ke Step 2 (Sekaligus Recheck Data Presensi Fisik di Database)
  const handleProceedToStep2 = async () => {
    if (selectedDates.length === 0) {
      toast.error('Mohon tentukan minimal 1 tanggal pelaksanaan presensi.');
      return;
    }
    if (selectedKelasIds.length === 0) {
      toast.error('Mohon pilih minimal 1 rombel kelas sasaran.');
      return;
    }
    setCurrentStep(2);

    // Tarik kondisi data presensi fisik yang sudah ada di database untuk tanggal, sesi & rombel beririsan
    setIsLoadingDbMatrix(true);
    try {
      const res = await attendanceStagingApi.getExistingMatrix({
        dates: selectedDates,
        kelas_ids: selectedKelasIds,
        sessions: generatedSessions.map((s) => ({
          dateIso: s.dateIso,
          sessionCode: s.sessionCode,
          defaultType: s.defaultType,
        })),
      });

      if (res.success && res.data) {
        setExistingDbSessionsByKelas(res.data.existingSessionKeysByKelas || {});
        setDbRecheckStats({
          totalExistingSessions: res.data.totalExistingSessions || 0,
          totalExistingRecords: res.data.totalExistingRecords || 0,
        });

        // Gabungkan pengecualian non-hadir dari DB dengan yang mungkin sudah diceklis user di sesi UI ini
        if (res.data.exceptions && res.data.exceptions.length > 0) {
          setExceptionsList((prev) => {
            // Pertahankan perubahan manual user (from_db !== true), lalu tambahkan data fisik DB yang belum di-override
            const manualOnly = prev.filter((p) => !p.from_db);
            const merged = [...manualOnly];

            for (const dbEx of res.data.exceptions) {
              const existingIdx = merged.findIndex(
                (m) => m.siswa_id === dbEx.siswa_id && m.status === dbEx.status
              );
              if (existingIdx >= 0) {
                const combinedDates = Array.from(
                  new Set([...(merged[existingIdx].dates || []), ...(dbEx.dates || [])])
                ).sort();
                merged[existingIdx] = {
                  ...merged[existingIdx],
                  dates: combinedDates,
                };
              } else {
                merged.push(dbEx);
              }
            }
            return merged;
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch existing attendance matrix from DB:', err);
    } finally {
      setIsLoadingDbMatrix(false);
    }
  };

  // Navigasi ke Step 3 (Review Matriks)
  const handleProceedToStep3 = () => {
    const kId = activeFilterKelasId || selectedKelasIds[0];
    if (kId) {
      setPreviewKelasId(kId);
      fetchStudentsForClass(kId);
    }
    setCurrentStep(3);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      contentClassName="p-0 overflow-y-auto"
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100">
              Wizard Backfill Presensi Cepat (Manual UI Multi-Tanggal)
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              {currentStep === 1 && 'Langkah 1 dari 3: Konfigurasi Tanggal, Agenda & Rombel Kelas'}
              {currentStep === 2 && 'Langkah 2 dari 3: Input Siswa Non-Hadir (Daftar Pengecualian)'}
              {currentStep === 3 && 'Langkah 3 dari 3: Review Matriks Kehadiran Sebelum Eksekusi'}
            </p>
          </div>
        </div>
      }
    >
      <div className="p-4 sm:p-5 space-y-4">
        {/* ── COMPACT OFFICIAL EVENT GUARD BAR + STEPPER HEADER ── */}
        <div className="space-y-2.5">
          {isGuardEnabled ? (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Unlock className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200">
                  Guard Event Resmi Terbuka
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold uppercase">
                  Disetujui Admin
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300/80 hidden sm:inline">
                  &bull; Siap memilih tanggal &amp; menceklis siswa non-hadir
                </span>
              </div>
              {isAdmin && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isTogglingGuard}
                  onClick={() => handleToggleGuard(false)}
                  className="shrink-0 h-7 px-2.5 text-[11px] font-bold border-rose-200 bg-white hover:bg-rose-50 text-rose-600 rounded-lg gap-1 cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  <span>{isTogglingGuard ? 'Mengunci...' : 'Kunci Guard'}</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="px-3.5 py-2.5 rounded-xl bg-amber-50/95 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-amber-950 dark:text-amber-100">
                      Guard Keamanan Terkunci (Di Luar Event Resmi)
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-bold uppercase">
                      Eksekusi Dikunci
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-200/90 truncate">
                    Anda tetap dapat menyusun tanggal &amp; simulasi ceklis siswa, namun penyimpanan dikunci hingga Guard dibuka Admin.
                  </p>
                </div>
              </div>
              {isAdmin ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={isTogglingGuard || isGuardLoading}
                  onClick={() => handleToggleGuard(true)}
                  className="shrink-0 h-7 px-3 text-[11px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{isTogglingGuard ? 'Membuka...' : 'Buka Guard'}</span>
                </Button>
              ) : (
                <span className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 border border-amber-300 text-[10px] font-bold text-amber-900 dark:text-amber-200 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Dikunci Admin</span>
                </span>
              )}
            </div>
          )}

          {/* ── STEPPER PROGRESS BAR ── */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 select-none">
            {([
              { step: 1, title: '1. Jadwal & Rombel', desc: `${selectedDates.length} Tanggal • ${selectedKelasIds.length} Kelas` },
              { step: 2, title: '2. Ceklis Non-Hadir', desc: `${exceptionsList.length} Siswa Non-Hadir` },
              { step: 3, title: '3. Review & Simpan', desc: 'Matriks Kehadiran' },
            ] as const).map((s) => {
              const isActive = currentStep === s.step;
              const isCompleted = currentStep > s.step;
              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => {
                    if (s.step === 1) setCurrentStep(1);
                    else if (s.step === 2 && selectedDates.length > 0 && selectedKelasIds.length > 0) setCurrentStep(2);
                    else if (s.step === 3 && selectedDates.length > 0 && selectedKelasIds.length > 0) handleProceedToStep3();
                  }}
                  className={`py-2 px-3 rounded-lg text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 shadow-2xs border border-amber-300 dark:border-amber-700/60'
                      : isCompleted
                      ? 'hover:bg-white/60 dark:hover:bg-slate-900/50 text-slate-700 dark:text-slate-300'
                      : 'opacity-50 cursor-not-allowed text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <span
                          className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-700'
                          }`}
                        >
                          {s.step}
                        </span>
                      )}
                      <span className={`text-xs font-extrabold truncate ${isActive ? 'text-amber-800 dark:text-amber-300' : ''}`}>
                        {s.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold hidden sm:inline shrink-0">
                      {s.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* ── STEP 1: JADWAL PELAKSANAAN & SASARAN ROMBEL (CLEAN & COMPACT) ── */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="space-y-3.5">
            {/* Multi-Tanggal Generator */}
            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  1. Pilih Tanggal Pelaksanaan Backfill
                </span>
                <div className="flex items-center gap-2">
                  {selectedDates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedDates([])}
                      className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      Reset Tanggal
                    </button>
                  )}
                  <Badge variant="neutral" className="text-[10px] font-bold">
                    {selectedDates.length} Tanggal Terpilih
                  </Badge>
                </div>
              </div>

              {/* Clean Single-Row Date Range & Single Date Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-end bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <div className="lg:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Dari Tanggal
                  </label>
                  <input
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    className="w-full h-8 text-xs font-semibold px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="lg:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Sampai Tanggal
                  </label>
                  <input
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    className="w-full h-8 text-xs font-semibold px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="lg:col-span-3 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-semibold select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSunday}
                      onChange={(e) => setIncludeSunday(e.target.checked)}
                      className="rounded text-amber-600"
                    />
                    <span>+Minggu</span>
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGenerateDateRange}
                    className="h-8 px-3 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg ml-auto cursor-pointer"
                  >
                    + Isi Rentang
                  </Button>
                </div>
                <div className="lg:col-span-3 flex items-end gap-1.5 lg:border-l lg:border-slate-200 dark:lg:border-slate-700 lg:pl-2.5">
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Tanggal Satuan
                    </label>
                    <input
                      type="date"
                      value={singleDateInput}
                      onChange={(e) => setSingleDateInput(e.target.value)}
                      className="w-full h-8 text-xs font-semibold px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddSingleDate}
                    className="h-8 px-2.5 text-xs font-bold rounded-lg shrink-0 cursor-pointer"
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Chip Tanggal Terpilih */}
              {selectedDates.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {selectedDates.map((dStr) => (
                    <span
                      key={dStr}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-200 dark:border-amber-800/80"
                    >
                      {formatTanggalIndo(dStr)}
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(dStr)}
                        className="hover:text-rose-600 ml-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Pilih rentang tanggal lalu klik <strong>&quot;+ Isi Rentang&quot;</strong>, atau tambahkan tanggal satuan di sebelah kanan.
                </p>
              )}
            </div>

            {/* Sesi Agenda & Rombel Kelas */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              {/* Sesi Agenda */}
              <div className="md:col-span-5 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  2. Sesi Agenda Kegiatan
                </span>
                <select
                  value={agendaMode}
                  onChange={(e) => setAgendaMode(e.target.value as AgendaMode)}
                  className="w-full h-9 text-xs font-bold px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="AUTO_SIKLUS">
                    ⚡ Siklus Otomatis (Upacara, Ketarunaan, Dhuha &amp; Sore)
                  </option>
                  <option value="KETARUNAAN">Khusus Apel &amp; Latihan Ketarunaan (Pagi)</option>
                  <option value="ALL_SIKLUS">Semua Siklus (Apel Pagi + Apel Sore)</option>
                  <option value="UPACARA">Khusus Upacara Bendera (Senin Pagi)</option>
                  <option value="DUHA">Khusus Pembiasaan Dhuha (Jum&apos;at Pagi)</option>
                  <option value="APEL_SORE">Khusus Apel Sore (15:30 WIB)</option>
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Otomatis memetakan sesi sesuai hari sekolah yang dipilih di atas.
                </p>
              </div>

              {/* Target Rombel */}
              <div className="md:col-span-7 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    3. Target Rombel ({selectedKelasIds.length} Kelas)
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={handleSelectKelasX}
                      className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-100 cursor-pointer"
                    >
                      Kelas X (Taruna)
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllKelas}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 cursor-pointer"
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={handleClearKelas}
                      className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 font-bold hover:bg-rose-100 cursor-pointer"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="border border-slate-100 dark:border-slate-800 rounded-lg p-2 grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5 bg-slate-50/50 dark:bg-slate-800/30">
                  {classOptions.map((c) => {
                    const isSelected = selectedKelasIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedKelasIds(selectedKelasIds.filter((id) => id !== c.id));
                          } else {
                            setSelectedKelasIds([...selectedKelasIds, c.id]);
                          }
                        }}
                        className={`px-2 py-1 rounded-md text-[10px] font-extrabold truncate text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        {c.nama_kelas}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* ── STEP 2: MATRIKS CEKLIS LANGSUNG (2 X 5 SIKLUS BLOK TERBUKA) ── */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              {/* Top Toolbar: Info Siklus Klik (H -> S -> I -> A -> T -> D) + Legend */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Table className="w-4 h-4 text-amber-600" />
                    Matriks Ceklis Kehadiran Terbuka ({selectedDates.length} Hari &times; Siklus Sesi = {generatedSessions.length} Blok Sesi)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    <strong>Klik kotak sesi untuk memutar siklus status:</strong> Klik 1x = <strong className="text-amber-600">Sakit (S)</strong> &rarr; Klik 2x = <strong className="text-blue-600">Izin (I)</strong> &rarr; Klik 3x = <strong className="text-rose-600">Alpa (A)</strong> &rarr; Klik 4x = <strong className="text-orange-600">Telat (T)</strong> &rarr; Klik 5x = <strong className="text-purple-600">Dispen (D)</strong> &rarr; Kembali <strong className="text-emerald-600">Hadir (H)</strong>.
                  </p>
                </div>

                {/* Urutan Siklus Klik Badge Visual */}
                <div className="flex items-center gap-1 flex-wrap shrink-0 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-[10px] font-extrabold">
                  <span className="text-slate-500 uppercase mr-1">Siklus Klik:</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">H</span>
                  <span className="text-slate-400">&rarr;</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white">1. Sakit (S)</span>
                  <span className="text-slate-400">&rarr;</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white">2. Izin (I)</span>
                  <span className="text-slate-400">&rarr;</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white">3. Alpa (A)</span>
                  <span className="text-slate-400">&rarr;</span>
                  <span className="px-1.5 py-0.5 rounded bg-orange-500 text-white">4. Telat (T)</span>
                  <span className="text-slate-400">&rarr;</span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white">5. Dispen (D)</span>
                </div>
              </div>

              {/* ── BANNER STATUS RECHECK DATA FISIK DATABASE ── */}
              {isLoadingDbMatrix ? (
                <div className="px-3 py-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70 text-xs font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                  <span>Sedang memeriksa &amp; menyinkronkan kondisi data presensi fisik di database untuk tanggal dan sesi yang beririsan...</span>
                </div>
              ) : dbRecheckStats.totalExistingSessions > 0 ? (
                <div className="px-3.5 py-2 rounded-xl bg-sky-50/90 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-sky-600 text-white text-[10px] font-black uppercase">
                      ✓ Recheck Database Aktif
                    </span>
                    <span className="text-sky-950 dark:text-sky-200 font-semibold">
                      Ditemukan <strong>{dbRecheckStats.totalExistingSessions} Sesi Beririsan</strong> ({dbRecheckStats.totalExistingRecords.toLocaleString('id-ID')} data presensi siswa) yang sudah tersimpan di database. Kondisi kehadiran (H/S/I/A/T/D) otomatis ditampilkan pada kolom bertanda <strong className="text-sky-700 dark:text-sky-300">✓ DB</strong>.
                    </span>
                  </div>
                </div>
              ) : null}

              {/* ── ROMBEL QUICK PILLS & SEARCH BAR ── */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase shrink-0 mr-1">
                    Rombel ({selectedKelasIds.length}):
                  </span>
                  {selectedKelasIds.map((kId) => {
                    const c = classOptions.find((opt) => opt.id === kId);
                    const isCurrentKelas = (activeFilterKelasId || selectedKelasIds[0]) === kId;
                    const countInClass = exceptionsList.filter((ex) => ex.nama_kelas === c?.nama_kelas).length;

                    return (
                      <button
                        key={kId}
                        type="button"
                        onClick={() => setActiveFilterKelasId(kId)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                          isCurrentKelas
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        <span>{c?.nama_kelas || kId}</span>
                        {countInClass > 0 && (
                          <span
                            className={`px-1.5 rounded-full text-[10px] font-black ${
                              isCurrentKelas ? 'bg-white text-emerald-800' : 'bg-amber-500 text-white'
                            }`}
                          >
                            {countInClass}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full lg:w-64 shrink-0">
                  <input
                    type="text"
                    value={studentChecklistSearch}
                    onChange={(e) => setStudentChecklistSearch(e.target.value)}
                    placeholder="Cari cepat nama atau NIS siswa..."
                    className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                </div>
              </div>

              {/* ── DIRECT INTERACTIVE 2 X N SIKLUS BLOCK MATRIX TABLE ── */}
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-x-auto bg-white dark:bg-slate-900">
                {loadingStudents ? (
                  <div className="p-10 text-center text-xs text-slate-400">Memuat matriks siswa rombel...</div>
                ) : currentAvailableStudents.length === 0 ? (
                  <div className="p-10 text-center text-xs text-slate-400">Tidak ada data siswa pada rombel ini.</div>
                ) : (
                  (() => {
                    // Kelompokkan generatedSessions per tanggal untuk membentuk Header Grup Hari (1 Hari = Pagi & Sore)
                    const sortedUniqueDates = [...new Set(generatedSessions.map((s) => s.dateIso))];
                    const dateGroups = sortedUniqueDates.map((dIso) => {
                      const sessList = generatedSessions.filter((s) => s.dateIso === dIso);
                      return {
                        dateIso: dIso,
                        dayName: sessList[0]?.dayName || '',
                        dateFormatted: sessList[0]?.dateFormatted || dIso,
                        sessions: sessList,
                      };
                    });

                    const allSessionKeys = generatedSessions.map((s) => `${s.dateIso}_${s.sessionCode}`);
                    const kId = activeFilterKelasId || selectedKelasIds[0];
                    const kObj = classOptions.find((c) => c.id === kId);

                    const CYCLE_ORDER: Array<'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA' | 'TERLAMBAT' | 'DISPENSASI'> = [
                      'HADIR',
                      'SAKIT',
                      'IZIN',
                      'ALPA',
                      'TERLAMBAT',
                      'DISPENSASI',
                    ];

                    const getNextCycleStatus = (
                      current: 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA' | 'TERLAMBAT' | 'DISPENSASI'
                    ): 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA' | 'TERLAMBAT' | 'DISPENSASI' => {
                      const idx = CYCLE_ORDER.indexOf(current);
                      return CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
                    };

                    // Helper untuk mengubah status sejumlah sessionKeys sekaligus pada 1 siswa
                    const applyStudentSessionKeys = (
                      st: ClassStudentOption,
                      targetSessKeys: string[],
                      targetStatus: 'SAKIT' | 'IZIN' | 'ALPA' | 'TERLAMBAT' | 'DISPENSASI' | 'HADIR'
                    ) => {
                      setExceptionsList((prev) => {
                        // Ekspansi seluruh exception siswa ini ke map sessionKey -> status
                        const studentSessMap: Record<string, 'SAKIT' | 'IZIN' | 'ALPA' | 'TERLAMBAT' | 'DISPENSASI'> = {};
                        let existingNote: string | undefined;

                        for (const ex of prev) {
                          if (ex.siswa_id !== st.siswa_id) continue;
                          if (ex.catatan) existingNote = ex.catatan;
                          const rawKeys = ex.dates && ex.dates.length > 0 ? ex.dates : allSessionKeys;
                          for (const rk of rawKeys) {
                            if (rk.includes('_')) {
                              studentSessMap[rk] = ex.status;
                            } else {
                              for (const gs of generatedSessions) {
                                if (gs.dateIso === rk) {
                                  studentSessMap[`${gs.dateIso}_${gs.sessionCode}`] = ex.status;
                                }
                              }
                            }
                          }
                        }

                        for (const k of targetSessKeys) {
                          if (targetStatus === 'HADIR') {
                            delete studentSessMap[k];
                          } else {
                            studentSessMap[k] = targetStatus;
                          }
                        }

                        // Re-group kembali per status
                        const otherStudentsEx = prev.filter((e) => e.siswa_id !== st.siswa_id);
                        const groupedByStatus: Record<string, string[]> = {};
                        for (const [sKey, stVal] of Object.entries(studentSessMap)) {
                          if (!groupedByStatus[stVal]) groupedByStatus[stVal] = [];
                          groupedByStatus[stVal].push(sKey);
                        }

                        const rebuiltStudentEx: ManualBackfillException[] = Object.entries(groupedByStatus).map(
                          ([stVal, keys]) => ({
                            siswa_id: st.siswa_id,
                            nama_siswa: st.nama_siswa,
                            nis: st.nis,
                            nama_kelas: kObj?.nama_kelas || '',
                            status: stVal as any,
                            dates: keys.sort(),
                            catatan: existingNote,
                          })
                        );

                        return [...rebuiltStudentEx, ...otherStudentsEx];
                      });
                    };

                    return (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase text-[10px] font-black sticky top-0 z-20">
                          {/* Row 1: Grouped Date Headers (Misal: 5 Hari Siklus) */}
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th
                              rowSpan={2}
                              className="px-2.5 py-2 w-9 text-center border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                            >
                              No
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-2 min-w-[200px] border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                            >
                              Nama Siswa &amp; NIS
                            </th>
                            {dateGroups.map((dg) => (
                              <th
                                key={dg.dateIso}
                                colSpan={dg.sessions.length}
                                className="px-2 py-1.5 text-center border-r border-slate-200 dark:border-slate-700 bg-slate-200/70 dark:bg-slate-800/90"
                              >
                                <span className="text-amber-700 dark:text-amber-400 font-black">
                                  {dg.dayName}
                                </span>{' '}
                                <span className="text-slate-800 dark:text-slate-100 font-extrabold">
                                  {dg.dateFormatted}
                                </span>
                              </th>
                            ))}
                            <th
                              rowSpan={2}
                              className="px-2.5 py-2 text-center min-w-[90px] bg-slate-100 dark:bg-slate-800"
                            >
                              Ceklis Baris
                            </th>
                          </tr>

                          {/* Row 2: Individual Session Blocks (2 x 5 Siklus Blok: Pagi & Sore) */}
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            {dateGroups.map((dg) =>
                              dg.sessions.map((sess, sIdx) => {
                                const sessKey = `${sess.dateIso}_${sess.sessionCode}`;
                                const isExistingInDb = (existingDbSessionsByKelas[kId] || []).includes(sessKey);

                                return (
                                  <th
                                    key={`${sessKey}_${sIdx}`}
                                    className={`px-1.5 py-1.5 text-center min-w-[68px] border-r border-slate-200 dark:border-slate-700 ${
                                      isExistingInDb
                                        ? 'bg-sky-50/90 dark:bg-sky-950/40'
                                        : 'bg-slate-50 dark:bg-slate-800/50'
                                    }`}
                                  >
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span
                                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black ${
                                          sess.sessionCode === 'PAGI'
                                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                            : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                        }`}
                                      >
                                        {sess.sessionLabel}
                                      </span>
                                      {isExistingInDb && (
                                        <span
                                          className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-sky-600 text-white text-[8px] font-extrabold tracking-tight"
                                          title="Sesi ini sudah memiliki data fisik di database (Ditampilkan untuk Recheck)"
                                        >
                                          ✓ DB
                                        </span>
                                      )}
                                    </div>
                                  </th>
                                );
                              })
                            )}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {currentAvailableStudents
                            .filter((st) => {
                              if (!studentChecklistSearch.trim()) return true;
                              const q = studentChecklistSearch.toLowerCase();
                              return (
                                st.nama_siswa.toLowerCase().includes(q) ||
                                (st.nis && st.nis.toLowerCase().includes(q))
                              );
                            })
                            .map((st, sIdx) => {
                              const hasAnyException = exceptionsList.some((e) => e.siswa_id === st.siswa_id);

                              return (
                                <tr
                                  key={st.siswa_id}
                                  className={`transition-colors ${
                                    hasAnyException
                                      ? 'bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-50/90'
                                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                                  }`}
                                >
                                  <td className="px-2 py-1.5 text-center font-bold text-slate-400 border-r border-slate-100 dark:border-slate-800">
                                    {sIdx + 1}
                                  </td>
                                  <td className="px-3 py-1.5 border-r border-slate-100 dark:border-slate-800">
                                    <span className="font-bold text-slate-800 dark:text-slate-100 block truncate max-w-[210px]">
                                      {st.nama_siswa}
                                    </span>
                                    {st.nis && (
                                      <span className="text-[10px] text-slate-400 font-mono block">
                                        NIS: {st.nis}
                                      </span>
                                    )}
                                  </td>

                                  {/* 2 x N Siklus Block Interactive Cells */}
                                  {dateGroups.map((dg) =>
                                    dg.sessions.map((sess, sessIdx) => {
                                      const sessKey = `${sess.dateIso}_${sess.sessionCode}`;
                                      const { status } = getStudentSessionStatus(st.siswa_id, sess);

                                      const badgeStyle =
                                        status === 'HADIR'
                                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70'
                                          : status === 'SAKIT'
                                          ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                                          : status === 'IZIN'
                                          ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                                          : status === 'ALPA'
                                          ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                                          : status === 'TERLAMBAT'
                                          ? 'bg-orange-500 text-white border-orange-600 shadow-2xs'
                                          : 'bg-purple-600 text-white border-purple-700 shadow-2xs';

                                      const shortCode =
                                        status === 'HADIR'
                                          ? 'H'
                                          : status === 'SAKIT'
                                          ? 'S'
                                          : status === 'IZIN'
                                          ? 'I'
                                          : status === 'ALPA'
                                          ? 'A'
                                          : status === 'TERLAMBAT'
                                          ? 'T'
                                          : 'D';

                                      const nextStatus = getNextCycleStatus(status);
                                      const isExistingInDb = (existingDbSessionsByKelas[kId] || []).includes(sessKey);

                                      return (
                                        <td
                                          key={`${sessKey}_${sessIdx}`}
                                          className={`p-1 text-center border-r border-slate-100 dark:border-slate-800 ${
                                            isExistingInDb ? 'bg-sky-50/40 dark:bg-sky-950/15' : ''
                                          }`}
                                        >
                                          <button
                                            type="button"
                                            onClick={() =>
                                              applyStudentSessionKeys(st, [sessKey], nextStatus)
                                            }
                                            title={`${st.nama_siswa} • ${sess.dayName}, ${sess.dateFormatted} (${sess.sessionLabel})${
                                              isExistingInDb ? ' [✓ Sudah Ada di Database]' : ''
                                            }\nStatus saat ini: ${status} -> Klik untuk ubah ke [${nextStatus}]`}
                                            className={`w-full h-7 rounded-lg border font-black text-[11px] transition-all cursor-pointer select-none flex items-center justify-center active:scale-95 ${badgeStyle} ${
                                              isExistingInDb && status === 'HADIR'
                                                ? 'ring-1 ring-sky-400/70 dark:ring-sky-500/60'
                                                : ''
                                            }`}
                                          >
                                            {shortCode}
                                          </button>
                                        </td>
                                      );
                                    })
                                  )}

                                  {/* Quick Row Action: Siklus Semua Blok / Dropdown Baris */}
                                  <td className="px-2 py-1 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const firstSess = generatedSessions[0];
                                          const currentFirstStatus = firstSess
                                            ? getStudentSessionStatus(st.siswa_id, firstSess).status
                                            : 'HADIR';
                                          const nextRowStatus = getNextCycleStatus(currentFirstStatus);
                                          applyStudentSessionKeys(st, allSessionKeys, nextRowStatus);
                                        }}
                                        title={`Klik berulang untuk memutar siklus status seluruh sesi baris ini (H -> S -> I -> A -> T -> D)`}
                                        className="px-2 py-1 rounded-md text-[10px] font-extrabold bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer select-none"
                                      >
                                        Semua
                                      </button>
                                      {hasAnyException && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            applyStudentSessionKeys(st, allSessionKeys, 'HADIR')
                                          }
                                          title="Reset kembali menjadi HADIR di semua sesi"
                                          className="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    );
                  })()
                )}
              </div>

              {/* Ringkasan Chips Siswa Non-Hadir Terpilih Lintas Rombel & Sesi */}
              {exceptionsList.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">
                      Ringkasan Siswa Non-Hadir Terpilih ({exceptionsList.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setExceptionsList([])}
                      className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      Reset Semua ke HADIR
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {exceptionsList.map((ex, idx) => (
                      <span
                        key={`${ex.siswa_id}_${idx}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-slate-800 dark:text-slate-200 border border-amber-200 dark:border-amber-800/80"
                      >
                        <span className="px-1.5 py-0.2 rounded bg-amber-600 text-white text-[9px] font-black">
                          {ex.status}
                        </span>
                        <span>{ex.nama_siswa}</span>
                        <span className="text-[10px] text-slate-400">({ex.nama_kelas})</span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                          &bull; {ex.dates ? `${ex.dates.length} Blok Sesi` : 'Semua Sesi'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveException(idx)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* ── STEP 3: REVIEW MATRIKS KEHADIRAN (TRUE MATRIX PREVIEW) ── */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="space-y-4">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">Total Tanggal:</span>
                <strong className="text-base font-black text-slate-800 dark:text-slate-100">
                  {selectedDates.length} Hari
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">Total Sesi Rombel:</span>
                <strong className="text-base font-black text-indigo-600 dark:text-indigo-400">
                  {generatedSessions.length} Sesi Pertemuan
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">Total Kelas:</span>
                <strong className="text-base font-black text-slate-800 dark:text-slate-100">
                  {selectedKelasIds.length} Rombel
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-bold">Non-Hadir (Pengecualian):</span>
                <strong className="text-base font-black text-amber-600">
                  {exceptionsList.length} Siswa
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block font-bold">Otomatis HADIR:</span>
                <strong className="text-base font-black text-emerald-600">
                  &plusmn;{Math.max(estimatedTotalStudents - exceptionsList.length, 0)} Siswa (99%)
                </strong>
              </div>
            </div>

            {/* Matrix Viewer Header Controls */}
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Pratinjau Matriks Kehadiran (Preview Output Presensi)
                  </span>
                </div>

                {/* Pilih Rombel yang ingin dipratinjau */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400">Pratinjau Kelas:</span>
                  <select
                    value={activePreviewClassId}
                    onChange={(e) => {
                      setPreviewKelasId(e.target.value);
                      fetchStudentsForClass(e.target.value);
                    }}
                    className="text-xs font-black px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  >
                    {selectedKelasIds.map((kId) => {
                      const c = classOptions.find((opt) => opt.id === kId);
                      return (
                        <option key={kId} value={kId}>
                          {c?.nama_kelas || kId}
                        </option>
                      );
                    })}
                  </select>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari siswa..."
                      value={previewSearchStudent}
                      onChange={(e) => setPreviewSearchStudent(e.target.value)}
                      className="text-xs font-medium pl-7 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                  </div>
                </div>
              </div>

              {/* Attendance Matrix Table */}
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] sticky top-0 z-20 shadow-2xs">
                    <tr>
                      <th className="px-2.5 py-2 w-10 text-center border-r border-slate-200 dark:border-slate-700">No</th>
                      <th className="px-3 py-2 min-w-[170px] border-r border-slate-200 dark:border-slate-700">Nama Siswa</th>
                      {generatedSessions.map((sess, sIdx) => (
                        <th
                          key={`${sess.dateIso}_${sess.sessionCode}_${sIdx}`}
                          className="px-2 py-1.5 text-center min-w-[70px] border-r border-slate-200 dark:border-slate-700"
                        >
                          <span className="block text-[9px] font-bold text-slate-400">{sess.dayName}</span>
                          <span className="block font-black text-slate-800 dark:text-slate-100">{sess.dateFormatted}</span>
                          <span className="inline-block px-1 rounded text-[8px] font-extrabold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                            {sess.sessionLabel}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPreviewStudents.length > 0 ? (
                      filteredPreviewStudents.map((st, idx) => (
                        <tr key={st.siswa_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="px-2 py-1.5 text-center font-bold text-slate-400 border-r border-slate-100 dark:border-slate-800">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-1.5 border-r border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-slate-800 dark:text-slate-100 block truncate max-w-[160px]">
                              {st.nama_siswa}
                            </span>
                            {st.nis && <span className="text-[9px] text-slate-400 block font-mono">{st.nis}</span>}
                          </td>
                          {generatedSessions.map((sess, sIdx) => {
                            const { status, isException } = getStudentSessionStatus(st.siswa_id, sess);
                            return (
                              <td
                                key={`${sess.dateIso}_${sess.sessionCode}_${sIdx}`}
                                className="px-1.5 py-1 text-center border-r border-slate-100 dark:border-slate-800"
                              >
                                {status === 'HADIR' ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black text-[10px]">
                                    H
                                  </span>
                                ) : status === 'SAKIT' ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-black text-[10px]">
                                    S
                                  </span>
                                ) : status === 'IZIN' ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-black text-[10px]">
                                    I
                                  </span>
                                ) : status === 'ALPA' ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-black text-[10px]">
                                    A
                                  </span>
                                ) : status === 'TERLAMBAT' ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 font-black text-[10px]">
                                    T
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-black text-[10px]">
                                    D
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={generatedSessions.length + 2}
                          className="px-4 py-8 text-center text-slate-400 italic text-xs"
                        >
                          {loadingStudents ? 'Memuat daftar siswa...' : 'Tidak ada data siswa ditemukan untuk kelas ini.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Legend & Information */}
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pt-1 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-[9px]">H</span>
                    Hadir (Otomatis)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-amber-100 text-amber-800 font-black flex items-center justify-center text-[9px]">S</span>
                    Sakit
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-blue-100 text-blue-800 font-black flex items-center justify-center text-[9px]">I</span>
                    Izin
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-rose-100 text-rose-800 font-black flex items-center justify-center text-[9px]">A</span>
                    Alpa
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-orange-100 text-orange-800 font-black flex items-center justify-center text-[9px]">T</span>
                    Terlambat
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded bg-purple-100 text-purple-800 font-black flex items-center justify-center text-[9px]">D</span>
                    Dispensasi
                  </span>
                </div>
                <span className="text-slate-400">
                  Total {previewClassStudents.length} Siswa Terdaftar di {classOptions.find(c => c.id === activePreviewClassId)?.nama_kelas}
                </span>
              </div>
            </div>

            {/* Direct Sync Option & Final Title */}
            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between flex-wrap gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={directSync}
                  onChange={(e) => setDirectSync(e.target.checked)}
                  className="rounded text-emerald-600 w-4 h-4"
                />
                <span>
                  Langsung Sinkronkan ke Presensi Resmi (Direct 1-Click Sync &amp; Masuk Radar Ketarunaan)
                </span>
              </label>
              <span className="text-[11px] text-slate-400 italic">
                {directSync
                  ? 'Sesi absensi resmi, kehadiran siswa & wali kelas langsung aktif.'
                  : 'Data disimpan di penampung staging (READY) untuk ditinjau dulu.'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER ACTIONS BERDASARKAN STEP ── */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        {currentStep === 1 && (
          <>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleProceedToStep2}
              disabled={selectedDates.length === 0 || selectedKelasIds.length === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 shadow-sm"
            >
              Lanjut ke Input Siswa Non-Hadir (Step 2)
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </>
        )}

        {currentStep === 2 && (
          <>
            <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Kembali ke Jadwal &amp; Rombel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleProceedToStep3}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 shadow-sm"
            >
              Lanjut ke Review Matriks Kehadiran (Step 3)
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </>
        )}

        {currentStep === 3 && (
          <>
            <Button type="button" variant="outline" onClick={() => setCurrentStep(2)} disabled={isSubmitting}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Kembali ke Input Non-Hadir
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmitGenerate}
              disabled={isSubmitting || selectedDates.length === 0 || selectedKelasIds.length === 0 || !isGuardEnabled}
              title={!isGuardEnabled ? 'Guard Keamanan sedang dikunci oleh Admin (Di Luar Event Resmi)' : undefined}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs px-6 shadow-md"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Memproses &amp; Menyimpan Presensi...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  {directSync ? '🚀 Eksekusi & Simpan Presensi Resmi' : 'Simpan ke Penampung Staging'}
                </span>
              )}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
});

AttendanceStagingManualBackfillModal.displayName = 'AttendanceStagingManualBackfillModal';
