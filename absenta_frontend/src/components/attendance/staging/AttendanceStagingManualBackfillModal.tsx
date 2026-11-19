import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Users,
  UserCheck,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Shield,
  Layers,
  Search,
  ArrowRight,
  Info,
  Check,
  X,
  FileCheck,
} from 'lucide-react';
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
  classOptions: Array<{ id: string; nama_kelas: string; tingkat: number; jurusan_nama?: string }>;
  onSuccess: () => void;
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
  classOptions,
  onSuccess,
}) => {
  // ── Step 1: Multi-Tanggal State ──
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [includeSunday, setIncludeSunday] = useState<boolean>(false);
  const [singleDateInput, setSingleDateInput] = useState<string>('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // ── Step 2: Agenda & Target Kelas ──
  const [agendaMode, setAgendaMode] = useState<AgendaMode>('AUTO_SIKLUS');
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>([]);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [directSync, setDirectSync] = useState<boolean>(true);

  // ── Step 3: Exception Input (Siswa Non-Hadir) ──
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

  // Auto-select 20 Rombel Kelas X saat modal pertama dibuka
  useEffect(() => {
    if (isOpen && classOptions.length > 0 && selectedKelasIds.length === 0) {
      const kelasX = classOptions.filter(
        (c) => c.tingkat === 10 || c.nama_kelas.toUpperCase().startsWith('X ')
      );
      if (kelasX.length > 0) {
        setSelectedKelasIds(kelasX.map((c) => c.id));
        setActiveFilterKelasId(kelasX[0].id);
      }
    }
  }, [isOpen, classOptions, selectedKelasIds.length]);

  // Fetch siswa saat kelas terpilih berubah
  useEffect(() => {
    if (!isOpen || selectedKelasIds.length === 0) return;

    const kelasToFetch = activeFilterKelasId || selectedKelasIds[0];
    if (kelasToFetch && !classStudentsMap[kelasToFetch]) {
      setLoadingStudents(true);
      attendanceStagingApi
        .getClassStudents(kelasToFetch)
        .then((res) => {
          if (res.success) {
            setClassStudentsMap((prev) => ({ ...prev, [kelasToFetch]: res.data || [] }));
          }
        })
        .catch((err) => {
          console.error('Failed to fetch class students:', err);
        })
        .finally(() => {
          setLoadingStudents(false);
        });
    }
  }, [isOpen, activeFilterKelasId, selectedKelasIds, classStudentsMap]);

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
      // Skip Minggu jika tidak dicentang
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
    // Bersihkan juga dari custom dates exception jika ada
    setExceptionCustomDates((prev) => prev.filter((d) => d !== dStr));
  };

  // Handler: Quick Select Rombel
  const handleSelectKelasX = () => {
    const xList = classOptions
      .filter((c) => c.tingkat === 10 || c.nama_kelas.toUpperCase().startsWith('X '))
      .map((c) => c.id);
    setSelectedKelasIds(xList);
    if (xList.length > 0) setActiveFilterKelasId(xList[0]);
    toast.success(`Dipilih ${xList.length} Rombel Kelas X.`);
  };

  const handleSelectAllKelas = () => {
    const all = classOptions.map((c) => c.id);
    setSelectedKelasIds(all);
    if (all.length > 0) setActiveFilterKelasId(all[0]);
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

    // Cek duplikasi
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

    // Reset input pengecualian
    setSelectedStudentId('');
    setExceptionNotes('');
  };

  // Handler: Hapus Siswa dari Daftar Pengecualian
  const handleRemoveException = (index: number) => {
    setExceptionsList((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Perkiraan total siswa dari rombel terpilih
  const estimatedTotalStudents = useMemo(() => {
    return selectedKelasIds.length * 36;
  }, [selectedKelasIds.length]);

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
              Backfill Presensi Cepat (Manual UI Multi-Tanggal)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Input presensi multi-tanggal berbasis pengecualian. Masukkan siswa yang tidak hadir saja, siswa lainnya otomatis tercatat HADIR.
            </p>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
        {/* ── BAGIAN 1: MULTI-TANGGAL GENERATOR ── */}
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              1. Tentukan Tanggal Pelaksanaan (Bisa Multi-Tanggal / Rentang)
            </span>
            <Badge variant="neutral" className="text-[11px] font-bold">
              {selectedDates.length} Tanggal Dipilih
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
                Ikutkan Hari Minggu
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

          {/* Input Single Date Quick Add */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-2">
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
            <div className="flex items-center gap-1.5 flex-wrap pt-2">
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

        {/* ── BAGIAN 2: AGENDA KEGIATAN & ROMBEL KELAS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mode Agenda */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              2. Sesi Agenda Kegiatan
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
              Pilihan <strong>Siklus Lengkap Otomatis</strong> memetakan apel pagi sesuai hari sekolah dan apel sore, sangat direkomendasikan untuk pembinaan Ketarunaan terpadu.
            </p>
          </div>

          {/* Rombel Kelas Sasaran */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                3. Target Rombel Kelas ({selectedKelasIds.length} Kelas)
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

            <div className="max-h-28 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl p-2 flex flex-wrap gap-1.5">
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

        {/* ── BAGIAN 3: INPUT SISWA NON-HADIR (EXCEPTION LIST) ── */}
        <div className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                4. Input Siswa Non-Hadir (Daftar Pengecualian)
              </span>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                ⚡ <strong>Aturan Otomatis:</strong> Seluruh siswa dalam rombel terpilih otomatis dicatat <strong>HADIR TEPAT WAKTU</strong>. Anda hanya perlu memilih siswa yang <strong>Sakit, Izin, Alpa, Dispensasi, atau Terlambat</strong> di bawah.
              </p>
            </div>
            <Badge variant="warning" className="text-[11px] font-black shrink-0">
              {exceptionsList.length} Pengecualian
            </Badge>
          </div>

          {/* Form Tambah Siswa Non-Hadir */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-amber-900/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* Filter Rombel untuk Pemilih Siswa */}
              <div className="sm:col-span-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Pilih Kelas Siswa:
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

              {/* Dropdown Siswa */}
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

              {/* Status Non-Hadir */}
              <div className="sm:col-span-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Status Kehadiran:
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

              {/* Tombol Tambah */}
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

            {/* Opsi Tambahan: Menit Keterlambatan & Catatan */}
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
          </div>

          {/* Tabel Daftar Pengecualian */}
          {exceptionsList.length > 0 ? (
            <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
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
              Belum ada siswa non-hadir. Jika di-generate sekarang, <strong>100% siswa di seluruh rombel terpilih akan otomatis tercatat HADIR TEPAT WAKTU</strong>.
            </div>
          )}
        </div>

        {/* ── BAGIAN 4: RINGKASAN & DIRECT SYNC TOGGLE ── */}
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              Ringkasan Evaluasi Sebelum Generate
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">Total Tanggal:</span>
              <strong className="text-sm font-black text-slate-800 dark:text-slate-100">
                {selectedDates.length} Hari Pelaksanaan
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">Total Rombel:</span>
              <strong className="text-sm font-black text-slate-800 dark:text-slate-100">
                {selectedKelasIds.length} Rombel Kelas
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">Pengecualian (Non-Hadir):</span>
              <strong className="text-sm font-black text-amber-600">
                {exceptionsList.length} Siswa
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">Otomatis Dicatat HADIR:</span>
              <strong className="text-sm font-black text-emerald-600">
                &plusmn;{Math.max(estimatedTotalStudents - exceptionsList.length, 0)} Siswa (99%)
              </strong>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
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
                ? 'Data sesi resmi, kehadiran siswa & wali kelas langsung dibuat aktif.'
                : 'Data disimpan di penampung staging (READY) untuk ditinjau dulu.'}
            </span>
          </div>
        </div>
      </div>

      {/* ── FOOTER ACTIONS ── */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Batal
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={handleSubmitGenerate}
          disabled={isSubmitting || selectedDates.length === 0 || selectedKelasIds.length === 0}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 shadow-sm"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              Memproses Backfill Presensi...
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {directSync ? 'Generate & Langsung Sinkronkan Presensi' : 'Generate & Simpan ke Staging'}
            </span>
          )}
        </Button>
      </div>
    </Modal>
  );
});

AttendanceStagingManualBackfillModal.displayName = 'AttendanceStagingManualBackfillModal';
