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

  // Helper status per cell di matriks preview
  const getStudentSessionStatus = useCallback((siswaId: string, sess: typeof generatedSessions[0]): {
    status: 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA' | 'DISPENSASI' | 'TERLAMBAT';
    isException: boolean;
  } => {
    const matched = exceptionsList.find((ex) => {
      if (ex.siswa_id !== siswaId) return false;
      if (!ex.dates || ex.dates.length === 0) return true;
      return ex.dates.includes(sess.dateIso);
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

  // Navigasi ke Step 2
  const handleProceedToStep2 = () => {
    if (selectedDates.length === 0) {
      toast.error('Mohon tentukan minimal 1 tanggal pelaksanaan presensi.');
      return;
    }
    if (selectedKelasIds.length === 0) {
      toast.error('Mohon pilih minimal 1 rombel kelas sasaran.');
      return;
    }
    setCurrentStep(2);
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
      size="6xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
              Wizard Backfill Presensi Cepat (Manual UI Multi-Tanggal)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {currentStep === 1 && 'Langkah 1 dari 3: Konfigurasi Tanggal, Agenda & Rombel Kelas'}
              {currentStep === 2 && 'Langkah 2 dari 3: Input Siswa Non-Hadir (Daftar Pengecualian)'}
              {currentStep === 3 && 'Langkah 3 dari 3: Review Matriks Kehadiran Sebelum Eksekusi'}
            </p>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
        {/* ── OFFICIAL EVENT GUARD BANNER (ANTI-MANIPULATION GUARD) ── */}
        {isGuardEnabled ? (
          <div className="p-3.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Unlock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-950 dark:text-emerald-200">
                    Guard Terbuka • Mode Event Resmi Rekonsiliasi Aktif
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5">
                    DISETUJUI ADMIN
                  </Badge>
                </div>
                <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90">
                  Anda diizinkan memilih rentang tanggal, menceklis siswa non-hadir, dan mengeksekusi Backfill Presensi ke belakang.
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isTogglingGuard}
                onClick={() => handleToggleGuard(false)}
                className="shrink-0 h-8 px-3 text-xs font-bold border-rose-300 bg-white hover:bg-rose-50 text-rose-700 rounded-xl gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isTogglingGuard ? 'Mengunci...' : 'Kunci Guard'}</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-50/95 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-100">
                    Guard Keamanan Aktif • Eksekusi Backfill Presensi Dikunci
                  </span>
                  <Badge className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5">
                    DI LUAR EVENT RESMI
                  </Badge>
                </div>
                <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                  Untuk menghindari manipulasi data presensi ke belakang, penyimpanan Backfill dikunci di luar Event Resmi. Anda tetap dapat menyusun tanggal, menceklis siswa non-hadir, dan meninjau matriks pratinjau, namun tombol <strong>Eksekusi &amp; Simpan</strong> hanya dapat ditekan bila Guard dibuka oleh Admin.
                </p>
              </div>
            </div>
            {isAdmin ? (
              <Button
                type="button"
                size="sm"
                disabled={isTogglingGuard || isGuardLoading}
                onClick={() => handleToggleGuard(true)}
                className="shrink-0 h-9 px-4 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs gap-1.5"
              >
                <Unlock className="w-4 h-4" />
                <span>{isTogglingGuard ? 'Membuka...' : 'Aktifkan Event Resmi (Buka Guard)'}</span>
              </Button>
            ) : (
              <div className="shrink-0 px-3 py-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 border border-amber-300 text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Dikunci Admin</span>
              </div>
            )}
          </div>
        )}

        {/* ── STEPPER PROGRESS BAR ── */}
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 select-none">
          {([
            { step: 1, title: '1. Jadwal & Rombel', desc: `${selectedDates.length} Tanggal • ${selectedKelasIds.length} Kelas` },
            { step: 2, title: '2. Siswa Non-Hadir', desc: `${exceptionsList.length} Pengecualian` },
            { step: 3, title: '3. Review Matriks', desc: 'Pratinjau Kehadiran' },
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
                className={`py-2 px-3 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 shadow-sm border border-amber-300 dark:border-amber-700/60'
                    : isCompleted
                    ? 'hover:bg-white/50 dark:hover:bg-slate-900/50 text-slate-600 dark:text-slate-300'
                    : 'opacity-50 cursor-not-allowed text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-700'
                      }`}
                    >
                      {s.step}
                    </span>
                  )}
                  <span className={`text-xs font-black truncate ${isActive ? 'text-amber-800 dark:text-amber-300' : ''}`}>
                    {s.title}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block pl-5 truncate font-medium">
                  {s.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* ── STEP 1: JADWAL PELAKSANAAN & SASARAN ROMBEL ── */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="space-y-5">
            {/* Multi-Tanggal Generator */}
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  Pilih Kumpulan Tanggal Pelaksanaan
                </span>
                <Badge variant="neutral" className="text-[11px] font-bold">
                  {selectedDates.length} Tanggal Terpilih
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-4">
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Tanggal Mulai:
                  </label>
                  <input
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">
                    Tanggal Selesai:
                  </label>
                  <input
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="md:col-span-4 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-bold select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSunday}
                      onChange={(e) => setIncludeSunday(e.target.checked)}
                      className="rounded text-amber-600"
                    />
                    Ikutkan Minggu
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateDateRange}
                    className="text-xs font-bold border-amber-300 text-amber-700 hover:bg-amber-50 ml-auto"
                  >
                    + Isi Rentang
                  </Button>
                </div>
              </div>

              {/* Single Date Quick Add */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400">Atau tambah tanggal tunggal:</span>
                <input
                  type="date"
                  value={singleDateInput}
                  onChange={(e) => setSingleDateInput(e.target.value)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddSingleDate}
                  className="text-xs font-bold h-7"
                >
                  + Tambah
                </Button>
                {selectedDates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDates([])}
                    className="text-[11px] text-rose-600 hover:underline ml-auto font-bold"
                  >
                    Reset Semua Tanggal
                  </button>
                )}
              </div>

              {/* Chip Tanggal Terpilih */}
              {selectedDates.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap pt-2 max-h-36 overflow-y-auto">
                  {selectedDates.map((dStr) => (
                    <span
                      key={dStr}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-100/80 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-200 dark:border-amber-800/80 shadow-2xs"
                    >
                      {formatTanggalIndo(dStr)}
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(dStr)}
                        className="hover:text-rose-600 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  Belum ada tanggal dipilih. Masukkan tanggal mulai &amp; selesai lalu klik &quot;+ Isi Rentang&quot;.
                </p>
              )}
            </div>

            {/* Sesi Agenda & Rombel Kelas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sesi Agenda */}
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Sesi Agenda Kegiatan
                </span>
                <select
                  value={agendaMode}
                  onChange={(e) => setAgendaMode(e.target.value as AgendaMode)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <option value="AUTO_SIKLUS">
                    ⚡ Siklus Lengkap Otomatis (Senin Upacara, Sel-Kam-Sab Ketarunaan, Jum Dhuha + Sore)
                  </option>
                  <option value="ALL_SIKLUS">Semua Siklus (Apel Pagi + Apel Sore)</option>
                  <option value="KETARUNAAN">Khusus Apel &amp; Latihan Ketarunaan (Pagi)</option>
                  <option value="UPACARA">Khusus Upacara Bendera (Senin Pagi)</option>
                  <option value="DUHA">Khusus Pembiasaan Dhuha (Jum&apos;at Pagi)</option>
                  <option value="APEL_SORE">Khusus Apel Sore (15:30 WIB)</option>
                </select>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Pilihan <strong>Siklus Lengkap Otomatis</strong> otomatis memetakan sesi pagi &amp; sore sesuai hari sekolah, sangat direkomendasikan untuk pembinaan Ketarunaan terpadu.
                </p>
              </div>

              {/* Target Rombel */}
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Target Rombel Kelas ({selectedKelasIds.length} Kelas)
                  </span>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={handleSelectKelasX}
                      className="text-amber-600 font-bold hover:underline"
                    >
                      Kelas X (Taruna)
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleSelectAllKelas}
                      className="text-slate-500 font-bold hover:underline"
                    >
                      Semua
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearKelas}
                      className="text-rose-500 font-bold hover:underline"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="max-h-36 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl p-2 flex flex-wrap gap-1.5">
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
                        className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
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
        {/* ── STEP 2: INPUT SISWA NON-HADIR (EXCEPTION LIST) ── */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Input Siswa Non-Hadir (Daftar Pengecualian)
                  </span>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    ⚡ <strong>Prinsip Cepat:</strong> Seluruh siswa di {selectedKelasIds.length} rombel terpilih otomatis dianggap <strong>HADIR TEPAT WAKTU</strong>. Anda hanya perlu memasukkan siswa yang <strong>Sakit, Izin, Alpa, Dispensasi, atau Terlambat</strong> di bawah.
                  </p>
                </div>
                <Badge variant="warning" className="text-[11px] font-black shrink-0">
                  {exceptionsList.length} Pengecualian
                </Badge>
              </div>

              {/* Form Input Pengecualian */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-amber-900/40 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Pilih Rombel Siswa:
                    </label>
                    <select
                      value={activeFilterKelasId || selectedKelasIds[0] || ''}
                      onChange={(e) => setActiveFilterKelasId(e.target.value)}
                      className="w-full text-xs font-bold p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
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
                  </div>

                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Nama Siswa ({loadingStudents ? 'Memuat...' : `${currentAvailableStudents.length} Siswa`}):
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      disabled={loadingStudents || currentAvailableStudents.length === 0}
                      className="w-full text-xs font-bold p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    >
                      <option value="">-- Pilih Siswa Non-Hadir --</option>
                      {currentAvailableStudents.map((st) => (
                        <option key={st.siswa_id} value={st.siswa_id}>
                          {st.nis ? `[${st.nis}] ` : ''}{st.nama_siswa}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Status Ketidakhadiran:
                    </label>
                    <select
                      value={exceptionStatus}
                      onChange={(e) => setExceptionStatus(e.target.value as any)}
                      className="w-full text-xs font-black p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    >
                      <option value="SAKIT">SAKIT</option>
                      <option value="IZIN">IZIN</option>
                      <option value="ALPA">ALPA (Tanpa Keterangan)</option>
                      <option value="DISPENSASI">DISPENSASI</option>
                      <option value="TERLAMBAT">TERLAMBAT (Hadir Telat)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleAddException}
                      disabled={!selectedStudentId}
                      className="w-full h-9 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Tambah
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 items-center">
                  {exceptionStatus === 'TERLAMBAT' && (
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                        Menit Terlambat:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={lateMinutes}
                        onChange={(e) => setLateMinutes(Number(e.target.value))}
                        className="w-full text-xs font-bold p-1.5 rounded-lg border border-slate-200 dark:border-slate-800"
                      />
                    </div>
                  )}
                  <div className={exceptionStatus === 'TERLAMBAT' ? 'sm:col-span-9' : 'sm:col-span-12'}>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                      Catatan / Keterangan (Opsional):
                    </label>
                    <input
                      type="text"
                      placeholder="Misal: Surat dokter dari puskesmas / izin urusan keluarga..."
                      value={exceptionNotes}
                      onChange={(e) => setExceptionNotes(e.target.value)}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>

                {/* ── DAFTAR CEKLIS CEPAT SISWA ROMBEL (1-CLICK TOGGLE NON-HADIR) ── */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-amber-600" />
                        Ceklis Cepat Siswa Non-Hadir di Rombel Ini ({currentAvailableStudents.length} Siswa)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Klik tombol status (<strong>S / I / A / T / D</strong>) pada baris siswa yang tidak hadir. Siswa yang tidak diceklis otomatis <strong>HADIR</strong>.
                      </span>
                    </div>
                    <div className="relative w-full sm:w-56">
                      <input
                        type="text"
                        value={studentChecklistSearch}
                        onChange={(e) => setStudentChecklistSearch(e.target.value)}
                        placeholder="Cari nama / NIS siswa..."
                        className="w-full pl-7 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-slate-200/80 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
                    {loadingStudents ? (
                      <div className="p-6 text-center text-xs text-slate-400">Memuat daftar siswa rombel...</div>
                    ) : currentAvailableStudents.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">Tidak ada data siswa pada rombel ini.</div>
                    ) : (
                      currentAvailableStudents
                        .filter((st) => {
                          if (!studentChecklistSearch.trim()) return true;
                          const q = studentChecklistSearch.toLowerCase();
                          return st.nama_siswa.toLowerCase().includes(q) || (st.nis && st.nis.toLowerCase().includes(q));
                        })
                        .map((st, sIdx) => {
                          const existingExIndex = exceptionsList.findIndex((e) => e.siswa_id === st.siswa_id);
                          const existingEx = existingExIndex >= 0 ? exceptionsList[existingExIndex] : null;
                          const kId = activeFilterKelasId || selectedKelasIds[0];
                          const kObj = classOptions.find((c) => c.id === kId);

                          const toggleStudentException = (status: 'SAKIT' | 'IZIN' | 'ALPA' | 'TERLAMBAT' | 'DISPENSASI') => {
                            if (existingEx && existingEx.status === status) {
                              // Uncheck -> kembali jadi HADIR
                              setExceptionsList((prev) => prev.filter((e) => e.siswa_id !== st.siswa_id));
                            } else if (existingEx) {
                              // Ganti status
                              setExceptionsList((prev) =>
                                prev.map((e) => (e.siswa_id === st.siswa_id ? { ...e, status } : e))
                              );
                            } else {
                              // Ceklis baru sebagai non-hadir
                              setExceptionsList((prev) => [
                                {
                                  siswa_id: st.siswa_id,
                                  nama_siswa: st.nama_siswa,
                                  nis: st.nis,
                                  nama_kelas: kObj?.nama_kelas || '',
                                  status,
                                },
                                ...prev,
                              ]);
                            }
                          };

                          return (
                            <div
                              key={st.siswa_id}
                              className={`flex items-center justify-between gap-2 px-3 py-2 text-xs transition-colors ${
                                existingEx
                                  ? 'bg-amber-50/90 dark:bg-amber-950/30'
                                  : 'hover:bg-white dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-[11px] font-bold text-slate-400 w-5">{sIdx + 1}.</span>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate block">
                                    {st.nama_siswa}
                                  </span>
                                  {st.nis && <span className="text-[10px] text-slate-400 font-mono">NIS: {st.nis}</span>}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {!existingEx && (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 text-[10px] font-extrabold mr-1">
                                    HADIR
                                  </span>
                                )}
                                {(
                                  [
                                    { code: 'SAKIT', short: 'S', label: 'Sakit', activeCls: 'bg-amber-600 text-white border-amber-600' },
                                    { code: 'IZIN', short: 'I', label: 'Izin', activeCls: 'bg-blue-600 text-white border-blue-600' },
                                    { code: 'ALPA', short: 'A', label: 'Alpa', activeCls: 'bg-rose-600 text-white border-rose-600' },
                                    { code: 'TERLAMBAT', short: 'T', label: 'Telat', activeCls: 'bg-orange-600 text-white border-orange-600' },
                                    { code: 'DISPENSASI', short: 'D', label: 'Dispen', activeCls: 'bg-purple-600 text-white border-purple-600' },
                                  ] as const
                                ).map((btn) => {
                                  const isSelected = existingEx?.status === btn.code;
                                  return (
                                    <button
                                      key={btn.code}
                                      type="button"
                                      onClick={() => toggleStudentException(btn.code)}
                                      title={`Tandai ${btn.label}`}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                                        isSelected
                                          ? `${btn.activeCls} shadow-2xs`
                                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                                      }`}
                                    >
                                      {btn.short}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>

              {/* Tabel Daftar Pengecualian */}
              {exceptionsList.length > 0 ? (
                <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2">No</th>
                        <th className="px-3 py-2">Siswa</th>
                        <th className="px-3 py-2">Kelas</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Berlaku Tanggal</th>
                        <th className="px-3 py-2">Catatan</th>
                        <th className="px-3 py-2 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {exceptionsList.map((ex, idx) => (
                        <tr key={`${ex.siswa_id}_${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-3 py-2 font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <span className="font-extrabold text-slate-800 dark:text-slate-100 block">
                              {ex.nama_siswa}
                            </span>
                            {ex.nis && <span className="text-[10px] text-slate-400">NIS: {ex.nis}</span>}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">
                            {ex.nama_kelas}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={
                                ex.status === 'SAKIT'
                                  ? 'warning'
                                  : ex.status === 'IZIN'
                                  ? 'neutral'
                                  : ex.status === 'ALPA'
                                  ? 'error'
                                  : 'success'
                              }
                              className="text-[10px] font-black"
                            >
                              {ex.status}
                              {ex.menit_keterlambatan ? ` (${ex.menit_keterlambatan}m)` : ''}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-[11px] text-slate-500">
                            {ex.dates && ex.dates.length > 0 ? `${ex.dates.length} Tanggal Khusus` : 'Seluruh Tanggal Terpilih'}
                          </td>
                          <td className="px-3 py-2 text-[11px] text-slate-400 italic">
                            {ex.catatan || '-'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveException(idx)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                  Belum ada siswa non-hadir ditambahkan. Jika Anda langsung melanjutkan, <strong>100% siswa di seluruh rombel akan otomatis tercatat HADIR TEPAT WAKTU</strong>.
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
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-x-auto max-h-72 overflow-y-auto">
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
