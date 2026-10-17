import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Users,
  BookOpen,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Search,
  UserCheck,
  UserPlus,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { RaporPreSyncReport } from '@/api/rapor.api';

export interface RaporStagingPreSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: RaporPreSyncReport | null;
  isLoading: boolean;
  onConfirmSync: (
    autoProvision: boolean,
    customMapping?: Record<string, string>,
    sumberNilaiRapor?: 'FORMULA_SUMATIF' | 'MURNI_CP_MANUAL',
    customKelasId?: string
  ) => void;
  isSyncing: boolean;
}

export const RaporStagingPreSyncModal: React.FC<RaporStagingPreSyncModalProps> = React.memo(
  function RaporStagingPreSyncModal({
    isOpen,
    onClose,
    report,
    isLoading,
    onConfirmSync,
    isSyncing,
  }) {
    // ── Multi-Step State (Step 1, 2, 3, 4) ──
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

    // Opsi auto-provision siswa baru
    const [autoProvision, setAutoProvision] = useState(true);
    const [sumberNilaiRapor, setSumberNilaiRapor] = useState<'FORMULA_SUMATIF' | 'MURNI_CP_MANUAL'>('FORMULA_SUMATIF');
    const [selectedKelasId, setSelectedKelasId] = useState<string>('');

    // State mapping manual mapel: { [rawName]: mapelId | 'IGNORE' }
    const [manualMapping, setManualMapping] = useState<Record<string, string>>({});

    // Filter & Search di Step 2 (Siswa)
    const [studentSearch, setStudentSearch] = useState<string>('');
    const [studentFilterTab, setStudentFilterTab] = useState<'ALL' | 'MATCHED' | 'UNMATCHED'>('ALL');

    // Search di Step 3 (Mapel)
    const [mapelSearch, setMapelSearch] = useState<string>('');

    // Reset step saat modal dibuka
    useEffect(() => {
      if (isOpen) {
        setCurrentStep(1);
        setStudentSearch('');
        setStudentFilterTab('ALL');
        setMapelSearch('');
      }
    }, [isOpen]);

    // Inisialisasi sumber nilai dari laporan pre-sync
    useEffect(() => {
      if (report?.sumberNilaiRapor) {
        setSumberNilaiRapor(report.sumberNilaiRapor);
      }
    }, [report]);

    // Inisialisasi selectedKelasId dari kelas yang cocok
    useEffect(() => {
      if (report?.academicSlots.kelas.id) {
        setSelectedKelasId(report.academicSlots.kelas.id);
      } else {
        setSelectedKelasId('');
      }
    }, [report]);

    // Inisialisasi mapping awal dari saran backend
    useEffect(() => {
      if (report?.suggestedMapping) {
        setManualMapping({ ...report.suggestedMapping });
      } else {
        setManualMapping({});
      }
    }, [report]);

    // Handler perubahan mapping per mata pelajaran
    const handleMapelChange = useCallback((rawName: string, selectedMapelId: string) => {
      setManualMapping((prev) => ({
        ...prev,
        [rawName]: selectedMapelId,
      }));
    }, []);

    // Hitung berapa mapel yang sudah terpetakan (baik via ID maupun sengaja di-IGNORE)
    const detectedSubjects = useMemo(() => {
      const set = new Set<string>();
      report?.subjectSlots.matched.forEach((m) => set.add(m.raw));
      report?.subjectSlots.unmatched.forEach((u) => set.add(u));
      return Array.from(set);
    }, [report]);

    const mappedCount = useMemo(() => {
      return detectedSubjects.filter(
        (sub) => manualMapping[sub] && manualMapping[sub] !== ''
      ).length;
    }, [detectedSubjects, manualMapping]);

    const isAcademicReady = Boolean(
      report?.academicSlots.tahunPelajaran.isReady &&
      report?.academicSlots.semester.isReady &&
      (selectedKelasId || report?.academicSlots.kelas.isReady)
    );

    const hasUnmatchedStudents = (report?.studentSlots.unmatchedCount || 0) > 0;
    const hasUnmatchedMapels = (detectedSubjects.length - mappedCount) > 0;

    // Filter daftar siswa (Step 2)
    const filteredStudents = useMemo(() => {
      if (!report) return [];
      const matched = (report.studentSlots.matched || []).map((s) => ({ ...s, isMatched: true }));
      const unmatched = (report.studentSlots.unmatched || []).map((s) => ({ ...s, isMatched: false }));
      let all = [...matched, ...unmatched];

      if (studentFilterTab === 'MATCHED') {
        all = all.filter((s) => s.isMatched);
      } else if (studentFilterTab === 'UNMATCHED') {
        all = all.filter((s) => !s.isMatched);
      }

      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        all = all.filter(
          (s) =>
            s.nama.toLowerCase().includes(q) ||
            (s.nis && s.nis.toLowerCase().includes(q)) ||
            (s.nisn && s.nisn.toLowerCase().includes(q))
        );
      }

      return all;
    }, [report, studentFilterTab, studentSearch]);

    // Filter daftar mapel (Step 3)
    const filteredDetectedSubjects = useMemo(() => {
      if (!mapelSearch.trim()) return detectedSubjects;
      const q = mapelSearch.toLowerCase();
      return detectedSubjects.filter((s) => s.toLowerCase().includes(q));
    }, [detectedSubjects, mapelSearch]);

    // Info terpilih nama kelas & jurusan untuk Step 4 Ringkasan
    const selectedClassDisplay = useMemo(() => {
      if (!report) return '';
      const candidate = (report.academicSlots.kelas.candidateClasses || []).find((c) => c.id === selectedKelasId);
      if (candidate) {
        return `${candidate.nama_kelas} (${candidate.jurusanNama || candidate.jurusanKode || 'Umum'})`;
      }
      return `${report.academicSlots.kelas.raw} ${report.academicSlots.kelas.jurusanNama ? `(${report.academicSlots.kelas.jurusanNama})` : ''}`;
    }, [report, selectedKelasId]);

    const handleConfirm = useCallback(() => {
      onConfirmSync(autoProvision, manualMapping, sumberNilaiRapor, selectedKelasId || undefined);
    }, [autoProvision, manualMapping, sumberNilaiRapor, selectedKelasId, onConfirmSync]);

    if (!isOpen) return null;

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="2xl"
        title={
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-600 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <span className="block truncate font-bold text-slate-900 dark:text-slate-100">
                Pemeriksaan Kesiapan Slot (Pre-Sync Wizard)
              </span>
              <span className="block text-[11px] font-normal text-slate-500">
                Verifikasi multi-tahap sebelum sinkronisasi kelas {report?.namaKelas || ''}
              </span>
            </div>
          </div>
        }
      >
        <div className="p-4 sm:p-6 pt-2 space-y-4 w-full max-w-full min-w-0 text-xs">
          {isLoading ? (
            <div className="p-10 text-center space-y-2">
              <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 font-medium">Memeriksa ketersediaan slot master data...</p>
            </div>
          ) : !report ? (
            <div className="p-6 text-center text-slate-500">Gagal memuat laporan kesiapan slot.</div>
          ) : (
            <>
              {/* ── Stepper Navigation Header ── */}
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
                {[
                  { step: 1, label: '1. Akademik & Nilai', icon: Calendar },
                  { step: 2, label: '2. Matching Siswa', icon: Users },
                  { step: 3, label: '3. Matching Mapel', icon: BookOpen },
                  { step: 4, label: '4. Konfirmasi Sync', icon: ShieldCheck },
                ].map((s) => {
                  const isActive = currentStep === s.step;
                  const isPast = currentStep > s.step;
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => {
                        if (s.step < currentStep) {
                          setCurrentStep(s.step as 1 | 2 | 3 | 4);
                        } else if (s.step === 2 && isAcademicReady) {
                          setCurrentStep(2);
                        } else if (s.step === 3 && isAcademicReady) {
                          setCurrentStep(3);
                        } else if (s.step === 4 && isAcademicReady && !hasUnmatchedMapels) {
                          setCurrentStep(4);
                        }
                      }}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[11px] font-bold transition-all text-center truncate cursor-pointer',
                        isActive
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs ring-1 ring-slate-200 dark:ring-slate-700'
                          : isPast
                          ? 'text-emerald-700 dark:text-emerald-400 hover:bg-white/60 dark:hover:bg-slate-900/60'
                          : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                      )}
                      aria-label={`Langkah ${s.step}: ${s.label}`}
                    >
                      {isPast ? (
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" aria-hidden="true" />
                      ) : (
                        <Icon size={13} className="shrink-0" aria-hidden="true" />
                      )}
                      <span className="hidden sm:inline truncate">{s.label}</span>
                      <span className="sm:hidden">{s.step}</span>
                    </button>
                  );
                })}
              </div>

              {/* ════════════════════════════════════════════════════════════════
                  STEP 1: IDENTITAS AKADEMIK & OTORITAS NILAI RAPOR
                 ════════════════════════════════════════════════════════════════ */}
              {currentStep === 1 && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  {/* Status Banner */}
                  <div
                    className={cn(
                      'p-3 rounded-2xl border flex items-start gap-2.5',
                      !isAcademicReady
                        ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                        : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                    )}
                  >
                    {!isAcademicReady ? (
                      <XCircle size={18} className="text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="font-bold text-xs">
                        {!isAcademicReady
                          ? 'Slot Master Belum Lengkap (Terkunci)'
                          : 'Slot Akademik Ditemukan & Siap'}
                      </p>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        {!isAcademicReady
                          ? 'Tahun Pelajaran, Semester, atau Rombel Kelas belum terdaftar di platform master sekolah.'
                          : 'Identitas Tahun Pelajaran, Semester, dan Rombel Kelas cocok dengan data pokok Absenta.'}
                      </p>
                    </div>
                  </div>

                  {/* Kartu Kesiapan Slot Akademik */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                      <Calendar size={14} className="text-indigo-600" aria-hidden="true" />
                      <span>Ketersediaan Slot Akademik</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* TP */}
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 block">Tahun Pelajaran</span>
                          <span className="font-semibold block truncate">{report.academicSlots.tahunPelajaran.raw}</span>
                        </div>
                        {report.academicSlots.tahunPelajaran.isReady ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 shrink-0">Ada</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-300 shrink-0">Belum Ada</Badge>
                        )}
                      </div>
                      {/* Semester */}
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 block">Semester</span>
                          <span className="font-semibold block truncate">{report.academicSlots.semester.raw}</span>
                        </div>
                        {report.academicSlots.semester.isReady ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 shrink-0">Ada</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-300 shrink-0">Belum Ada</Badge>
                        )}
                      </div>
                      {/* Kelas */}
                      <div
                        className={cn(
                          'p-2.5 bg-white dark:bg-slate-900 rounded-xl border flex flex-col justify-between',
                          report.academicSlots.kelas.candidateClasses && report.academicSlots.kelas.candidateClasses.length > 1
                            ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/20'
                            : 'border-slate-200/60 dark:border-slate-700/60'
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 block">Rombel Kelas</span>
                            <span className="font-semibold block truncate">{report.academicSlots.kelas.raw}</span>
                          </div>
                          {report.academicSlots.kelas.isReady || selectedKelasId ? (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 shrink-0">Ada</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-300 shrink-0">Belum Ada</Badge>
                          )}
                        </div>

                        {/* Pilihan Rombel jika nama kembar */}
                        {report.academicSlots.kelas.candidateClasses && report.academicSlots.kelas.candidateClasses.length > 1 ? (
                          <div className="mt-2 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/60">
                            <label htmlFor="select-candidate-kelas" className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 block mb-1">
                              ⚠️ Ditemukan {report.academicSlots.kelas.candidateClasses.length} Jurusan untuk nama rombel ini:
                            </label>
                            <select
                              id="select-candidate-kelas"
                              value={selectedKelasId}
                              onChange={(e) => setSelectedKelasId(e.target.value)}
                              className="w-full h-7 text-[11px] rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-950 px-1 font-medium text-slate-800 dark:text-slate-100 cursor-pointer shadow-xs"
                              aria-label="Pilih rombel dan jurusan yang sesuai"
                            >
                              {report.academicSlots.kelas.candidateClasses.map((cand) => (
                                <option key={cand.id} value={cand.id}>
                                  {cand.nama_kelas} - {cand.jurusanNama || cand.jurusanKode || 'Umum'}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          report.academicSlots.kelas.jurusanNama && (
                            <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              Jurusan: <span className="font-semibold text-slate-700 dark:text-slate-200">{report.academicSlots.kelas.jurusanNama}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Slot Otoritas Sumber Nilai Rapor */}
                  <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-indigo-600" aria-hidden="true" />
                        Otoritas Penentu Nilai Rapor
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5',
                          sumberNilaiRapor === 'MURNI_CP_MANUAL'
                            ? 'border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30'
                            : 'border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
                        )}
                      >
                        {sumberNilaiRapor === 'MURNI_CP_MANUAL' ? 'MURNI SHEET CP' : 'FORMULA SUMATIF'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSumberNilaiRapor('FORMULA_SUMATIF')}
                        className={cn(
                          'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between',
                          sumberNilaiRapor === 'FORMULA_SUMATIF'
                            ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 font-semibold ring-1 ring-indigo-500/30'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                        )}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold">⚡ Hitung Formula Sumatif</span>
                          {sumberNilaiRapor === 'FORMULA_SUMATIF' && <Check size={13} className="text-indigo-600" />}
                        </div>
                        <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                          Rerata sumatif materi standar Kurikulum Merdeka
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSumberNilaiRapor('MURNI_CP_MANUAL')}
                        className={cn(
                          'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between',
                          sumberNilaiRapor === 'MURNI_CP_MANUAL'
                            ? 'border-amber-600 bg-amber-50/60 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 font-semibold ring-1 ring-amber-500/30'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                        )}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold">📝 Murni Lembar CP (Manual Guru)</span>
                          {sumberNilaiRapor === 'MURNI_CP_MANUAL' && <Check size={13} className="text-amber-600" />}
                        </div>
                        <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                          Ambil angka lembar CP apa adanya (Jamin nilai cetak fisik &amp; SKL)
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  STEP 2: HASIL MATCHING DENGAN DATA MASTER SISWA
                 ════════════════════════════════════════════════════════════════ */}
              {currentStep === 2 && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  {/* KPI Status Siswa */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center">
                      <span className="text-[10px] text-slate-400 block font-medium">Total di Spreadsheet</span>
                      <span className="text-base font-black text-slate-800 dark:text-slate-100">
                        {report.studentSlots.totalInSheet}
                      </span>
                    </div>
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 text-center">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-medium">Terdaftar di Master</span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-300">
                        {report.studentSlots.matchedCount}
                      </span>
                    </div>
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-800/60 text-center">
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 block font-medium">Siswa Baru</span>
                      <span className="text-base font-black text-amber-600 dark:text-amber-300">
                        {report.studentSlots.unmatchedCount}
                      </span>
                    </div>
                  </div>

                  {/* Checkbox Auto-Provision jika ada siswa baru */}
                  {hasUnmatchedStudents && (
                    <label
                      htmlFor="auto-provision-checkbox-step2"
                      className="flex items-start gap-2.5 p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl cursor-pointer hover:bg-amber-100/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        id="auto-provision-checkbox-step2"
                        checked={autoProvision}
                        onChange={(e) => setAutoProvision(e.target.checked)}
                        className="rounded border-amber-400 text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5 cursor-pointer"
                        aria-label="Otomatis buatkan slot dan daftarkan siswa baru"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-amber-950 dark:text-amber-200 block text-xs">
                          [Rekomendasi] Buat Akun &amp; Daftarkan {report.studentSlots.unmatchedCount} Siswa Baru Otomatis
                        </span>
                        <span className="text-[11px] text-amber-800 dark:text-amber-300 block leading-tight mt-0.5">
                          Siswa akan didaftarkan ke Master Siswa dengan NIS &amp; Nama dari spreadsheet serta otomatis diikatkan ke rombel ini.
                        </span>
                      </div>
                    </label>
                  )}

                  {/* Filter & Search Bar Siswa */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px]">
                      <button
                        type="button"
                        onClick={() => setStudentFilterTab('ALL')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer',
                          studentFilterTab === 'ALL'
                            ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs'
                            : 'text-slate-500 hover:text-slate-700'
                        )}
                      >
                        Semua ({report.studentSlots.totalInSheet})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentFilterTab('MATCHED')}
                        className={cn(
                          'px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer',
                          studentFilterTab === 'MATCHED'
                            ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-700'
                        )}
                      >
                        Terdaftar ({report.studentSlots.matchedCount})
                      </button>
                      {report.studentSlots.unmatchedCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setStudentFilterTab('UNMATCHED')}
                          className={cn(
                            'px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer',
                            studentFilterTab === 'UNMATCHED'
                              ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                              : 'text-slate-500 hover:text-slate-700'
                          )}
                        >
                          Siswa Baru ({report.studentSlots.unmatchedCount})
                        </button>
                      )}
                    </div>

                    <div className="relative flex-1 sm:max-w-xs">
                      <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari nama atau NIS siswa..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 text-[11px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        aria-label="Cari siswa dalam daftar matching"
                      />
                    </div>
                  </div>

                  {/* Tabel Daftar Siswa Matching */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    {filteredStudents.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs italic">
                        Tidak ada siswa yang sesuai dengan filter pencarian.
                      </div>
                    ) : (
                      filteredStudents.map((st, idx) => (
                        <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-[10px] text-slate-400 w-5 text-right">{idx + 1}</span>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 dark:text-slate-100 block truncate">
                                {st.nama}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                <span>NIS: {st.nis || '-'}</span>
                                {st.nisn && <span>• NISN: {st.nisn}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {st.isMatched ? (
                              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50/50 flex items-center gap-1">
                                <UserCheck size={11} />
                                <span>Terdaftar di Master</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50/50 flex items-center gap-1">
                                <UserPlus size={11} />
                                <span>Siswa Baru</span>
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  STEP 3: HASIL AUTO MATCHING MATA PELAJARAN
                 ════════════════════════════════════════════════════════════════ */}
              {currentStep === 3 && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  {/* Status Banner Mapel */}
                  <div
                    className={cn(
                      'p-3 rounded-2xl border flex items-center justify-between gap-2',
                      hasUnmatchedMapels
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                        : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {hasUnmatchedMapels ? (
                        <AlertTriangle size={16} className="text-amber-600 shrink-0" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" aria-hidden="true" />
                      )}
                      <span className="font-bold text-xs">
                        {hasUnmatchedMapels
                          ? `Perlu Pemetaan: ${detectedSubjects.length - mappedCount} Mata Pelajaran Belum Terpetakan`
                          : 'Seluruh Mata Pelajaran Berhasil Dipadankan!'}
                      </span>
                    </div>

                    <Badge
                      variant="secondary"
                      className={cn(
                        'font-bold text-xs shrink-0',
                        mappedCount === detectedSubjects.length ? 'text-emerald-600' : 'text-amber-600'
                      )}
                    >
                      {mappedCount} / {detectedSubjects.length} Terpetakan
                    </Badge>
                  </div>

                  {/* Search Bar Mapel */}
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari mata pelajaran spreadsheet..."
                      value={mapelSearch}
                      onChange={(e) => setMapelSearch(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 text-[11px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                      aria-label="Cari mata pelajaran spreadsheet"
                    />
                  </div>

                  {/* Tabel Pemetaan Mapel Interaktif */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    {filteredDetectedSubjects.map((sub, idx) => {
                      const currentMappedId = manualMapping[sub] || '';
                      const isMapped = Boolean(currentMappedId && currentMappedId !== '');
                      const matchedItem = report.subjectSlots.matched.find((m) => m.raw === sub);

                      return (
                        <div
                          key={idx}
                          className={cn(
                            'p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors',
                            !isMapped && 'bg-amber-50/40 dark:bg-amber-950/20'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 sm:w-1/3">
                            {isMapped ? (
                              <Check size={14} className="text-emerald-600 shrink-0" aria-hidden="true" />
                            ) : (
                              <AlertTriangle size={14} className="text-amber-600 shrink-0" aria-hidden="true" />
                            )}
                            <div className="min-w-0">
                              <span className="font-bold truncate text-slate-800 dark:text-slate-200 block">
                                {sub}
                              </span>
                              {matchedItem && currentMappedId === matchedItem.matchedId && (
                                <span className="text-[10px] text-emerald-600 font-medium block">
                                  ✓ Auto-Matched
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <ArrowRight size={13} className="text-slate-400 shrink-0 hidden sm:block" aria-hidden="true" />
                            <label htmlFor={`mapel-select-step3-${idx}`} className="sr-only">
                              Pilih mata pelajaran untuk {sub}
                            </label>
                            <select
                              id={`mapel-select-step3-${idx}`}
                              value={currentMappedId}
                              onChange={(e) => handleMapelChange(sub, e.target.value)}
                              className={cn(
                                'h-8 text-xs rounded-xl border bg-slate-50 dark:bg-slate-950 px-2 font-medium transition-colors cursor-pointer w-full',
                                isMapped
                                  ? 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
                                  : 'border-amber-400 text-amber-900 dark:text-amber-200 bg-amber-50/50'
                              )}
                              aria-label={`Pilih padanan mata pelajaran untuk ${sub}`}
                            >
                              <option value="">-- Pilih Master Mapel Sekolah --</option>
                              <option value="IGNORE">-- [ Abaikan / Jangan Simpan Mapel Ini ] --</option>
                              {(report.allTenantSubjects || []).map((m) => (
                                <option key={m.id} value={m.id}>
                                  [{m.kode_mapel || '-'}] {m.nama_mapel}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  STEP 4: RINGKASAN KONFIRMASI AKHIR (FINAL REVIEW)
                 ════════════════════════════════════════════════════════════════ */}
              {currentStep === 4 && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 flex items-start gap-2.5 text-emerald-900 dark:text-emerald-200">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-bold text-xs">Pemeriksaan Selesai &amp; Siap Disinkronkan!</p>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        Harap periksa ringkasan konfigurasi di bawah ini sebelum melanjutkan penyimpanan data ke modul e-Rapor resmi.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Ringkasan Akademik */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px]">
                        <GraduationCap size={14} className="text-indigo-600" aria-hidden="true" />
                        Identitas Rombel &amp; Akademik
                      </span>
                      <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Rombel Target:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{selectedClassDisplay}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tahun Pelajaran:</span>
                          <span className="font-semibold">{report.tahunPelajaranNama}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Semester:</span>
                          <span className="font-semibold">{report.semester}</span>
                        </div>
                      </div>
                    </div>

                    {/* Ringkasan Otoritas Nilai */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px]">
                        <Sparkles size={14} className="text-indigo-600" aria-hidden="true" />
                        Otoritas Nilai Rapor
                      </span>
                      <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Mode Nilai:</span>
                          <Badge variant="outline" className="font-bold text-[10px]">
                            {sumberNilaiRapor === 'MURNI_CP_MANUAL' ? 'MURNI SHEET CP' : 'FORMULA SUMATIF'}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-slate-400 block leading-tight pt-1">
                          {sumberNilaiRapor === 'MURNI_CP_MANUAL'
                            ? '✓ Nilai diambil murni dari lembar CP guru tanpa rumus sumatif (menjaga kesesuaian rapor cetak asli & SKL).'
                            : '✓ Nilai dihitung dari rata-rata sumatif standar Kurikulum Merdeka.'}
                        </span>
                      </div>
                    </div>

                    {/* Ringkasan Siswa */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px]">
                        <Users size={14} className="text-indigo-600" aria-hidden="true" />
                        Kesiapan Siswa
                      </span>
                      <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Siswa Terdaftar:</span>
                          <span className="font-bold text-emerald-600">{report.studentSlots.matchedCount} Siswa</span>
                        </div>
                        {report.studentSlots.unmatchedCount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Siswa Baru:</span>
                            <span className="font-bold text-amber-600">
                              {report.studentSlots.unmatchedCount} {autoProvision ? '(Akan Didaftarkan)' : '(Dilewati)'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ringkasan Mapel */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px]">
                        <BookOpen size={14} className="text-indigo-600" aria-hidden="true" />
                        Pemetaan Mata Pelajaran
                      </span>
                      <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Mapel:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{detectedSubjects.length} Mapel</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Terpetakan / Diabaikan:</span>
                          <span className="font-bold text-emerald-600">{mappedCount} Mapel</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Footer Navigasi Antar Step ── */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)}
                      className="text-xs rounded-xl gap-1 cursor-pointer"
                      aria-label="Kembali ke langkah sebelumnya"
                    >
                      <ArrowLeft size={13} aria-hidden="true" />
                      <span>Kembali</span>
                    </Button>
                  )}
                  {currentStep === 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onClose}
                      className="text-xs rounded-xl cursor-pointer"
                      aria-label="Batal pre-sync"
                    >
                      Batal
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Step 1 -> Step 2 */}
                  {currentStep === 1 && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={!isAcademicReady}
                      onClick={() => setCurrentStep(2)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5 cursor-pointer"
                      aria-label="Lanjut ke langkah 2: Matching Siswa"
                    >
                      <span>Lanjut: Matching Siswa</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </Button>
                  )}

                  {/* Step 2 -> Step 3 */}
                  {currentStep === 2 && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setCurrentStep(3)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5 cursor-pointer"
                      aria-label="Lanjut ke langkah 3: Matching Mapel"
                    >
                      <span>Lanjut: Matching Mapel</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </Button>
                  )}

                  {/* Step 3 -> Step 4 */}
                  {currentStep === 3 && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={hasUnmatchedMapels}
                      onClick={() => setCurrentStep(4)}
                      className={cn(
                        'text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5 transition-all cursor-pointer',
                        hasUnmatchedMapels
                          ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-75'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      )}
                      aria-label="Lanjut ke langkah 4: Konfirmasi Sync"
                    >
                      <span>
                        {hasUnmatchedMapels
                          ? `Petakan ${detectedSubjects.length - mappedCount} Mapel Lagi`
                          : 'Lanjut: Konfirmasi Sync'}
                      </span>
                      {!hasUnmatchedMapels && <ArrowRight size={13} aria-hidden="true" />}
                    </Button>
                  )}

                  {/* Step 4: Eksekusi Final */}
                  {currentStep === 4 && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={!isAcademicReady || hasUnmatchedMapels || isSyncing}
                      onClick={handleConfirm}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5 cursor-pointer"
                      aria-label="Mulai sinkronisasi sekarang ke e-Rapor"
                    >
                      <Sparkles size={13} aria-hidden="true" />
                      <span>{isSyncing ? 'Menyinkronkan...' : 'Mulai Sinkronisasi Sekarang'}</span>
                      {!isSyncing && <ArrowRight size={13} aria-hidden="true" />}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    );
  }
);

export default RaporStagingPreSyncModal;
