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
  Settings2,
  Check,
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
    // Default opsi auto-provision aktif agar siswa baru langsung dibuatkan slotnya
    const [autoProvision, setAutoProvision] = useState(true);
    const [showUnmatchedList, setShowUnmatchedList] = useState(false);
    const [showMapelSettings, setShowMapelSettings] = useState(false);
    const [sumberNilaiRapor, setSumberNilaiRapor] = useState<'FORMULA_SUMATIF' | 'MURNI_CP_MANUAL'>('FORMULA_SUMATIF');
    const [selectedKelasId, setSelectedKelasId] = useState<string>('');

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

    // State mapping manual: { [rawName]: mapelId | 'IGNORE' }
    const [manualMapping, setManualMapping] = useState<Record<string, string>>({});

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

    const handleConfirm = useCallback(() => {
      onConfirmSync(autoProvision, manualMapping, sumberNilaiRapor, selectedKelasId || undefined);
    }, [autoProvision, manualMapping, sumberNilaiRapor, selectedKelasId, onConfirmSync]);

    if (!isOpen) return null;

    const isAcademicReady = Boolean(
      report?.academicSlots.tahunPelajaran.isReady &&
      report?.academicSlots.semester.isReady &&
      (selectedKelasId || report?.academicSlots.kelas.isReady)
    );

    const hasUnmatchedStudents = (report?.studentSlots.unmatchedCount || 0) > 0;
    const hasUnmatchedMapels = (detectedSubjects.length - mappedCount) > 0;

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
                Pemeriksaan Kesiapan Slot (Pre-Sync Check)
              </span>
              <span className="block text-[11px] font-normal text-slate-500">
                Memverifikasi data master kelas {report?.namaKelas || ''} sebelum sinkronisasi
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
              {/* ── Status Banner Kesiapan ── */}
              <div
                className={cn(
                  'p-3 rounded-2xl border flex items-start gap-2.5',
                  !isAcademicReady
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                    : hasUnmatchedStudents || hasUnmatchedMapels
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                )}
              >
                {!isAcademicReady ? (
                  <XCircle size={18} className="text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                ) : hasUnmatchedStudents || hasUnmatchedMapels ? (
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="font-bold text-xs">
                    {!isAcademicReady
                      ? 'Slot Master Belum Lengkap (Sinkronisasi Terkunci)'
                      : hasUnmatchedMapels
                      ? `Perlu Pemetaan: ${detectedSubjects.length - mappedCount} Mata Pelajaran Belum Terpetakan`
                      : hasUnmatchedStudents
                      ? `Kesiapan 95%: Ditemukan ${report.studentSlots.unmatchedCount} Siswa Baru`
                      : 'Semua Slot 100% Siap Disinkronkan!'}
                  </p>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    {!isAcademicReady
                      ? 'Tahun Pelajaran, Semester, atau Kelas belum terdaftar di platform. Harap buat data master tersebut terlebih dahulu.'
                      : hasUnmatchedMapels
                      ? 'Gunakan menu Pemetaan Mapel Manual di bawah untuk memilih padanan mata pelajaran sekolah.'
                      : hasUnmatchedStudents
                      ? 'Ada siswa baru di spreadsheet. Aktifkan opsi buat slot otomatis di bawah agar siswa langsung didaftarkan ke Master Siswa.'
                      : 'Seluruh identitas akademik, akun siswa, dan mata pelajaran cocok dengan data pokok Absenta.'}
                  </p>
                </div>
              </div>

              {/* ── 1. Kesiapan Slot Akademik ── */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                  <Calendar size={14} className="text-indigo-600" aria-hidden="true" />
                  <span>1. Ketersediaan Slot Akademik</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* TP */}
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block">Tahun Pelajaran</span>
                      <span className="font-semibold block truncate">{report.academicSlots.tahunPelajaran.raw}</span>
                    </div>
                    {report.academicSlots.tahunPelajaran.isReady ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">Ada</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-300">Belum Ada</Badge>
                    )}
                  </div>
                  {/* Semester */}
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block">Semester</span>
                      <span className="font-semibold block truncate">{report.academicSlots.semester.raw}</span>
                    </div>
                    {report.academicSlots.semester.isReady ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">Ada</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-300">Belum Ada</Badge>
                    )}
                  </div>
                  {/* Kelas */}
                  <div
                    className={cn(
                      'p-2 bg-white dark:bg-slate-900 rounded-xl border flex flex-col justify-between',
                      report.academicSlots.kelas.candidateClasses && report.academicSlots.kelas.candidateClasses.length > 1
                        ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/20 sm:col-span-1'
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

                    {/* Info Jurusan / Selector Spesialisasi Keahlian */}
                    {report.academicSlots.kelas.candidateClasses && report.academicSlots.kelas.candidateClasses.length > 1 ? (
                      <div className="mt-2 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/60">
                        <label htmlFor="select-candidate-kelas" className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 block mb-1">
                          ⚠️ Jurusan Terdeteksi ({report.academicSlots.kelas.candidateClasses.length} Opsi Rombel):
                        </label>
                        <select
                          id="select-candidate-kelas"
                          value={selectedKelasId}
                          onChange={(e) => setSelectedKelasId(e.target.value)}
                          className="w-full h-7 text-[11px] rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-950 px-1 font-medium text-slate-800 dark:text-slate-100 cursor-pointer shadow-xs"
                          aria-label="Pilih rombel dan keahlian yang sesuai"
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

              {/* ── 2. Kesiapan Slot Siswa ── */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    <Users size={14} className="text-indigo-600" aria-hidden="true" />
                    <span>2. Kesiapan Slot Siswa</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="font-bold text-emerald-600">
                      {report.studentSlots.matchedCount} Terdaftar
                    </Badge>
                    {report.studentSlots.unmatchedCount > 0 && (
                      <Badge variant="secondary" className="font-bold text-amber-600">
                        {report.studentSlots.unmatchedCount} Siswa Baru
                      </Badge>
                    )}
                  </div>
                </div>

                {hasUnmatchedStudents && (
                  <div className="space-y-2 pt-1">
                    <label
                      htmlFor="auto-provision-checkbox"
                      className="flex items-start gap-2.5 p-2.5 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/50 rounded-xl cursor-pointer hover:bg-amber-100/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        id="auto-provision-checkbox"
                        checked={autoProvision}
                        onChange={(e) => setAutoProvision(e.target.checked)}
                        className="rounded border-amber-400 text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5 cursor-pointer"
                        aria-label="Otomatis buatkan slot dan daftarkan siswa baru"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-amber-950 dark:text-amber-200 block">
                          [Rekomendasi] Buat Slot & Daftarkan {report.studentSlots.unmatchedCount} Siswa Baru Otomatis
                        </span>
                        <span className="text-[11px] text-amber-800 dark:text-amber-300 block leading-tight">
                          Siswa akan didaftarkan ke Master Siswa dengan NIS & Nama dari spreadsheet serta otomatis diikatkan ke kelas ini.
                        </span>
                      </div>
                    </label>

                    <div className="flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => setShowUnmatchedList(!showUnmatchedList)}
                        className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                        aria-label="Tampilkan rincian siswa baru"
                      >
                        {showUnmatchedList ? 'Sembunyikan Daftar Siswa Baru' : `Lihat ${report.studentSlots.unmatchedCount} Siswa Baru`}
                      </button>
                    </div>

                    {showUnmatchedList && (
                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-32 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {report.studentSlots.unmatched.map((st, idx) => (
                          <div key={idx} className="p-2 flex items-center justify-between text-[11px]">
                            <span className="font-semibold">{st.nama}</span>
                            <span className="text-slate-400 font-mono text-[10px]">NIS: {st.nis || '-'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── 3. Kesiapan & Pemetaan Manual Mata Pelajaran ── */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    <BookOpen size={14} className="text-indigo-600" aria-hidden="true" />
                    <span>3. Kesiapan & Pemetaan Mata Pelajaran</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'font-bold',
                        mappedCount === detectedSubjects.length ? 'text-emerald-600' : 'text-amber-600'
                      )}
                    >
                      {mappedCount} dari {detectedSubjects.length} Mapel Terpetakan
                    </Badge>
                    <button
                      type="button"
                      onClick={() => setShowMapelSettings(!showMapelSettings)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                      aria-label="Atur pemetaan mata pelajaran secara manual"
                    >
                      <Settings2 size={13} aria-hidden="true" />
                      <span>{showMapelSettings ? 'Tutup Pemetaan' : 'Atur Manual'}</span>
                    </button>
                  </div>
                </div>

                {/* Panel Pemetaan Manual Mapel Interaktif */}
                {(showMapelSettings || hasUnmatchedMapels) && (
                  <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <p className="text-[11px] text-slate-500">
                      Sesuaikan atau pilih master mata pelajaran sekolah untuk masing-masing kolom spreadsheet berikut:
                    </p>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {detectedSubjects.map((sub, idx) => {
                        const currentMappedId = manualMapping[sub] || '';
                        const isMapped = Boolean(currentMappedId && currentMappedId !== '');

                        return (
                          <div
                            key={idx}
                            className={cn(
                              'p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs',
                              !isMapped && 'bg-amber-50/40 dark:bg-amber-950/20'
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 sm:w-1/3">
                              {isMapped ? (
                                <Check size={14} className="text-emerald-600 shrink-0" aria-hidden="true" />
                              ) : (
                                <AlertTriangle size={14} className="text-amber-600 shrink-0" aria-hidden="true" />
                              )}
                              <span className="font-bold truncate text-slate-800 dark:text-slate-200">
                                {sub}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <ArrowRight size={13} className="text-slate-400 shrink-0 hidden sm:block" aria-hidden="true" />
                              <label htmlFor={`mapel-select-${idx}`} className="sr-only">
                                Pilih mata pelajaran untuk {sub}
                              </label>
                              <select
                                id={`mapel-select-${idx}`}
                                value={currentMappedId}
                                onChange={(e) => handleMapelChange(sub, e.target.value)}
                                className={cn(
                                  'h-8 text-xs rounded-xl border bg-slate-50 dark:bg-slate-950 px-2 py-1 w-full font-medium transition-colors cursor-pointer',
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
              </div>

              {/* ── Slot Otoritas Sumber Nilai Rapor ── */}
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

              {/* ── Footer Aksi ── */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="min-w-0 flex items-center">
                  {hasUnmatchedMapels ? (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <AlertTriangle size={13} className="shrink-0" />
                      Masih ada {detectedSubjects.length - mappedCount} mapel belum dipetakan / diabaikan
                    </span>
                  ) : !isAcademicReady ? (
                    <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                      <XCircle size={13} className="shrink-0" />
                      Slot akademik belum lengkap
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    className="text-xs rounded-xl"
                    aria-label="Batal pre-sync"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!isAcademicReady || hasUnmatchedMapels || isSyncing}
                    onClick={handleConfirm}
                    className={cn(
                      'text-white font-semibold text-xs rounded-xl shadow-xs gap-1.5 transition-all',
                      !isAcademicReady || hasUnmatchedMapels
                        ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-70 hover:bg-slate-400'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    )}
                    aria-label="Lanjutkan eksekusi sinkronisasi"
                  >
                    <Sparkles size={13} aria-hidden="true" />
                    <span>
                      {isSyncing
                        ? 'Menyinkronkan...'
                        : hasUnmatchedMapels
                        ? `Petakan ${detectedSubjects.length - mappedCount} Mapel Lagi`
                        : 'Lanjutkan Sinkronisasi'}
                    </span>
                    {!isSyncing && !hasUnmatchedMapels && <ArrowRight size={13} aria-hidden="true" />}
                  </Button>
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
