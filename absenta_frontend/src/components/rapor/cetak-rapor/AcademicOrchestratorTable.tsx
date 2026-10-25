import React from 'react';
import {
  UserCheck,
  Sparkles,
  Briefcase,
  Award,
  GraduationCap,
  Lock,
  Loader,
  ArrowRightLeft,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import type { LegerStudent, SemesterDocumentOption } from '../../../types/cetakRapor.types';
import { SmartSemesterDropdown } from './SmartSemesterDropdown';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import { useIsMobile } from '../../../hooks/useIsMobile';

export interface AcademicOrchestratorTableProps {
  students: LegerStudent[];
  isLoading?: boolean;
  isJenjangSmk?: boolean;
  pdfLoading?: Record<string, boolean>;
  modeCetakRapor?: 'CP_ONLY' | 'SUMATIF_AND_CP' | 'SUMATIF_ONLY';
  startIndex?: number;
  onPrintBiodata: (studentId: string) => void;
  onPrintRaporSemester: (studentId: string, customTpId?: string, customSemId?: string) => void;
  onPrintRaporSumatif: (studentId: string, customTpId?: string, customSemId?: string) => void;
  onPrintP5: (studentId: string) => void;
  onPrintRaporPkl?: (student: LegerStudent) => void;
  onPrintSertifikatPkl?: (student: LegerStudent) => void;
  onPrintSertifikatUkk?: (student: LegerStudent) => void;
  onPrintSkl?: (studentId: string) => void;
  onOpenTranskrip?: (student: LegerStudent) => void;
  onOpenSummaryModal?: (student: LegerStudent) => void;
}

export const AcademicOrchestratorTable: React.FC<AcademicOrchestratorTableProps> = React.memo(({
  students,
  isLoading = false,
  startIndex = 0,
  isJenjangSmk = true,
  pdfLoading = {},
  modeCetakRapor = 'CP_ONLY',
  onPrintBiodata,
  onPrintRaporSemester,
  onPrintRaporSumatif,
  onPrintP5,
  onPrintRaporPkl,
  onPrintSertifikatPkl,
  onPrintSertifikatUkk,
  onPrintSkl,
  onOpenTranskrip,
  onOpenSummaryModal,
}) => {
  const showSumatif = modeCetakRapor === 'SUMATIF_AND_CP' || modeCetakRapor === 'SUMATIF_ONLY';
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <Loader className="w-8 h-8 text-indigo-600 animate-spin mb-2.5" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Memuat Pangkalan Data Dokumen Akademik...
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          Menyusun riwayat semester dan status kelayakan berkas tiap siswa
        </p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2.5">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          Tidak Ada Data Siswa Ditemukan
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-0.5">
          Pilih rombel atau kelas lain pada bar navigasi atas untuk menampilkan berkas orkestrasi dokumen akademik.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {isMobile ? (
        /* ── 1. Tampilan Mobile: Kartu Siswa Orquestrator (Shopee-Grade High-Density) ── */
        <div className="space-y-2.5">
          {students.map((student, index) => {
            const elig = student.dokumen_eligibility;
            const isPklRaporEligible = elig ? elig.rapor_pkl?.eligible ?? true : true;
            const isPklSertifikatEligible = elig ? elig.sertifikat_pkl?.eligible ?? true : true;
            const isUkkEligible = elig ? elig.sertifikat_ukk?.eligible ?? true : true;
            const isSklEligible = elig ? elig.skl?.eligible ?? true : true;
            const isTranskripEligible = elig ? elig.transkrip?.eligible ?? true : true;

            return (
            <div
              key={student.id}
              className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5"
            >
              {/* Baris Atas: Avatar, Nama Siswa, NIS, Badge Pindahan & Dropdown Rapor Semester */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0">
                    {student.nama_siswa.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate text-xs">
                        {student.nama_siswa}
                      </span>
                      {student.is_pindahan && (
                        <span className="px-1.5 py-0.2 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 text-amber-700 dark:text-amber-400 text-[9px] font-bold shrink-0">
                          Pindahan
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      No. {startIndex + index + 1} • NIS: {student.nis || '-'}
                    </div>
                  </div>
                </div>

                {/* Primary CTA: Smart Dropdown Rapor Semester */}
                <div className="shrink-0">
                  <SmartSemesterDropdown
                    studentId={student.id}
                    studentName={student.nama_siswa}
                    documentType="RAPOR_SEMESTER"
                    semesterList={student.riwayat_semester || []}
                    onSelectSemester={(semOption: SemesterDocumentOption) => {
                      onPrintRaporSemester(
                        student.id,
                        semOption.tahunPelajaranId,
                        semOption.semesterId
                      );
                    }}
                  />
                </div>
              </div>

              {/* Baris Bawah: Tombol Cepat Dokumen Lain (Horizontal Scroll Chip Bar) */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
                {/* Biodata */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPrintBiodata(student.id)}
                  className="h-7 px-2 text-[10.5px] font-semibold border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shrink-0 rounded-lg cursor-pointer"
                  title="Cetak Cover & Biodata Siswa"
                >
                  <UserCheck className="w-3 h-3 mr-1 text-indigo-600 dark:text-indigo-400" />
                  <span>Biodata</span>
                </Button>

                {/* Sumatif (Jika Aktif) */}
                {showSumatif && (
                  <SmartSemesterDropdown
                    studentId={student.id}
                    studentName={student.nama_siswa}
                    documentType="RAPOR_SUMATIF"
                    semesterList={student.riwayat_semester || []}
                    onSelectSemester={(semOption: SemesterDocumentOption) => {
                      onPrintRaporSumatif(
                        student.id,
                        semOption.tahunPelajaranId,
                        semOption.semesterId
                      );
                    }}
                  />
                )}

                {/* P5 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPrintP5(student.id)}
                  className="h-7 px-2 text-[10.5px] font-semibold border-amber-200/80 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 shrink-0 rounded-lg cursor-pointer"
                  title="Cetak Rapor P5"
                >
                  <Sparkles className="w-3 h-3 mr-1 text-amber-500" />
                  <span>P5</span>
                </Button>

                {/* PKL (Hanya SMK) */}
                {isJenjangSmk && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!isPklRaporEligible) {
                          toast.warning(`Rapor PKL: ${elig?.rapor_pkl?.reason || 'Belum memenuhi syarat'}`);
                          return;
                        }
                        onPrintRaporPkl?.(student);
                      }}
                      className={cn(
                        'h-7 px-2 text-[10.5px] font-semibold shrink-0 rounded-lg cursor-pointer',
                        isPklRaporEligible
                          ? 'border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50'
                          : 'opacity-50 cursor-not-allowed'
                      )}
                      title={isPklRaporEligible ? 'Cetak Rapor PKL' : 'Belum Memenuhi Syarat'}
                    >
                      <Briefcase className="w-3 h-3 mr-1 text-purple-600 dark:text-purple-400" />
                      <span>PKL</span>
                      {!isPklRaporEligible && <Lock className="w-2.5 h-2.5 ml-0.5 text-amber-500 shrink-0" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!isPklSertifikatEligible) {
                          toast.warning(`Sertifikat PKL: ${elig?.sertifikat_pkl?.reason || 'Belum memenuhi syarat'}`);
                          return;
                        }
                        onPrintSertifikatPkl?.(student);
                      }}
                      className={cn(
                        'h-7 px-2 text-[10.5px] font-semibold shrink-0 rounded-lg cursor-pointer',
                        isPklSertifikatEligible
                          ? 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50'
                          : 'opacity-50 cursor-not-allowed'
                      )}
                      title={isPklSertifikatEligible ? 'Cetak Sertifikat PKL' : 'Belum Memenuhi Syarat'}
                    >
                      <Award className="w-3 h-3 mr-1 text-amber-500" />
                      <span>Sertifikat</span>
                      {!isPklSertifikatEligible && <Lock className="w-2.5 h-2.5 ml-0.5 text-amber-500 shrink-0" />}
                    </Button>
                  </>
                )}

                {/* UKK (Hanya SMK) */}
                {isJenjangSmk && isUkkEligible && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPrintSertifikatUkk?.(student)}
                    className="h-7 px-2 text-[10.5px] font-semibold border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 hover:bg-orange-50 shrink-0 rounded-lg cursor-pointer"
                    title="Cetak Sertifikat UKK"
                  >
                    <Award className="w-3 h-3 mr-1 text-orange-500" />
                    <span>UKK</span>
                  </Button>
                )}

                {/* SKL */}
                {isSklEligible && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPrintSkl?.(student.id)}
                    className="h-7 px-2 text-[10.5px] font-semibold border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 shrink-0 rounded-lg cursor-pointer"
                    title="Cetak SKL"
                  >
                    <GraduationCap className="w-3 h-3 mr-1 text-rose-600 dark:text-rose-400" />
                    <span>SKL</span>
                  </Button>
                )}

                {/* Transkrip */}
                {isTranskripEligible && onOpenTranskrip && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenTranskrip(student)}
                    className="h-7 px-2 text-[10.5px] font-semibold border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 shrink-0 rounded-lg cursor-pointer"
                    title="Lihat Transkrip Nilai"
                  >
                    <Award className="w-3 h-3 mr-1 text-indigo-500" />
                    <span>Transkrip</span>
                  </Button>
                )}

                {/* Catatan / Summary Modal Walas */}
                {onOpenSummaryModal && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenSummaryModal(student)}
                    className="h-7 px-2 text-[10.5px] font-semibold border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 shrink-0 rounded-lg cursor-pointer"
                    title="Buka Catatan Walas, Ekstrakurikuler & Absensi"
                  >
                    <span>Catatan</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      /* ── 2. Tampilan Desktop: Tabel Lengkap 8 Slot Dokumen Digelar ── */
      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/90 dark:bg-slate-850 border-b border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-2 w-9 text-center">No</th>
              <th className="py-2.5 px-3 min-w-[150px]">Siswa</th>
              <th className="py-2.5 px-1.5 text-center whitespace-nowrap">1. Biodata</th>
              <th className="py-2.5 px-1.5 text-center whitespace-nowrap">2. Rapor Sem</th>
              <th className="py-2.5 px-1.5 text-center whitespace-nowrap">3. Sumatif</th>
              <th className="py-2.5 px-1.5 text-center whitespace-nowrap">4. P5</th>
              <th className="py-2.5 px-1.5 text-center whitespace-nowrap">5. Rapor PKL</th>
              <th className="py-2.5 px-1.5 text-center whitespace-nowrap">6. Sertifikat PKL</th>
              <th className="py-2.5 px-1.5 text-center whitespace-nowrap">7. UKK</th>
              <th className="py-2.5 px-2 text-center whitespace-nowrap">8. SKL / Transkrip</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {students.map((student, index) => {
              const elig = student.dokumen_eligibility;
              const isPklRaporEligible = elig ? elig.rapor_pkl?.eligible ?? true : true;
              const isPklSertifikatEligible = elig ? elig.sertifikat_pkl?.eligible ?? true : true;
              const isUkkEligible = elig ? elig.sertifikat_ukk?.eligible ?? true : true;
              const isSklEligible = elig ? elig.skl?.eligible ?? true : true;
              const isTranskripEligible = elig ? elig.transkrip?.eligible ?? true : true;

              return (
                <tr
                  key={student.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors"
                >
                  {/* 1. No */}
                  <td className="py-2 px-2 text-center font-bold text-slate-400 text-[11px]">
                    {startIndex + index + 1}
                  </td>

                  {/* 2. Identitas Siswa */}
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-black text-[11px] shrink-0">
                        {student.nama_siswa.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 max-w-[180px] xl:max-w-[220px]">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate text-[11px]">
                          {student.nama_siswa}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          NIS: {student.nis || '-'}
                        </div>
                        {/* Badge Siswa Pindahan */}
                        {student.is_pindahan && (
                          <div
                            className="inline-flex items-center gap-0.5 mt-0.5 px-1 py-0.1 rounded-sm bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 text-[9px] font-semibold"
                            title={`Siswa pindahan dari: ${student.sekolah_asal || 'Sekolah lain'}`}
                          >
                            <ArrowRightLeft className="w-2 h-2" />
                            <span>Pindahan</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 3. Cover & Biodata */}
                  <td className="py-2 px-1.5 text-center whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPrintBiodata(student.id)}
                      className="h-7 px-2 py-0.5 text-[11px] font-semibold border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 whitespace-nowrap cursor-pointer rounded-lg"
                      title="Cetak Cover & Biodata 17 Butir Siswa"
                    >
                      <UserCheck className="w-3 h-3 mr-1 text-indigo-600 dark:text-indigo-400" />
                      <span>Biodata</span>
                    </Button>
                  </td>

                  {/* 4. Rapor Semester (CK1-CK2) Dropdown Smart Sem 1-6 */}
                  <td className="py-2 px-1.5 text-center whitespace-nowrap">
                    <SmartSemesterDropdown
                      studentId={student.id}
                      studentName={student.nama_siswa}
                      documentType="RAPOR_SEMESTER"
                      semesterList={student.riwayat_semester || []}
                      onSelectSemester={(semOption: SemesterDocumentOption) => {
                        onPrintRaporSemester(
                          student.id,
                          semOption.tahunPelajaranId,
                          semOption.semesterId
                        );
                      }}
                    />
                  </td>

                  {/* Slot 3: Rapor Sumatif */}
                  <td className="py-2 px-1.5 text-center whitespace-nowrap">
                    {showSumatif ? (
                      <SmartSemesterDropdown
                        studentId={student.id}
                        studentName={student.nama_siswa}
                        documentType="RAPOR_SUMATIF"
                        semesterList={student.riwayat_semester || []}
                        onSelectSemester={(semOption: SemesterDocumentOption) => {
                          onPrintRaporSumatif(
                            student.id,
                            semOption.tahunPelajaranId,
                            semOption.semesterId
                          );
                        }}
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-slate-600 italic">-</span>
                    )}
                  </td>

                  {/* Slot 4: Rapor P5 */}
                  <td className="py-2 px-1.5 text-center whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPrintP5(student.id)}
                      className="h-7 px-2 py-0.5 text-[11px] font-semibold border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 whitespace-nowrap cursor-pointer rounded-lg"
                      title="Cetak Lembar Rapor Projek Penguatan Profil Pelajar Pancasila"
                    >
                      <Sparkles className="w-3 h-3 mr-1 text-amber-500" />
                      <span>P5</span>
                    </Button>
                  </td>

                  {/* Slot 5: Rapor PKL */}
                  <td className="py-2 px-1.5 text-center whitespace-nowrap">
                    {isJenjangSmk ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!isPklRaporEligible) {
                            toast.warning(
                              `Rapor PKL: ${elig?.rapor_pkl?.reason || 'Belum memenuhi syarat'}`
                            );
                            return;
                          }
                          onPrintRaporPkl?.(student);
                        }}
                        className={cn(
                          'h-7 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap rounded-lg',
                          isPklRaporEligible
                            ? 'border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 cursor-pointer'
                            : 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
                        )}
                        title={
                          isPklRaporEligible
                            ? 'Cetak Rapor PKL Resmi'
                            : `🔒 Terkunci: ${elig?.rapor_pkl?.reason || 'Belum memenuhi syarat'}`
                        }
                      >
                        <Briefcase className="w-3 h-3 mr-0.5 text-purple-600 dark:text-purple-400" />
                        <span>Rapor</span>
                        {!isPklRaporEligible && (
                          <Lock className="w-2.5 h-2.5 ml-0.5 text-amber-500 shrink-0" />
                        )}
                      </Button>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-slate-600">-</span>
                    )}
                  </td>

                  {/* Slot 6: Sertifikat PKL */}
                  <td className="py-2 px-1.5 text-center whitespace-nowrap">
                    {isJenjangSmk ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!isPklSertifikatEligible) {
                            toast.warning(
                              `Sertifikat PKL: ${elig?.sertifikat_pkl?.reason || 'Belum memenuhi syarat'}`
                            );
                            return;
                          }
                          onPrintSertifikatPkl?.(student);
                        }}
                        className={cn(
                          'h-7 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap rounded-lg',
                          isPklSertifikatEligible
                            ? 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer'
                            : 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
                        )}
                        title={
                          isPklSertifikatEligible
                            ? 'Cetak Sertifikat & Piagam PKL'
                            : `🔒 Terkunci: ${elig?.sertifikat_pkl?.reason || 'Belum memenuhi syarat'}`
                        }
                      >
                        <Award className="w-3 h-3 mr-0.5 text-amber-500" />
                        <span>Sertifikat</span>
                        {!isPklSertifikatEligible && (
                          <Lock className="w-2.5 h-2.5 ml-0.5 text-amber-500 shrink-0" />
                        )}
                      </Button>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-slate-600">-</span>
                    )}
                  </td>

                  {/* Slot 7: Sertifikat UKK */}
                  <td className="py-2 px-1.5 text-center whitespace-nowrap">
                    {isJenjangSmk ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!isUkkEligible) {
                            toast.warning(
                              `Sertifikat UKK: ${elig?.sertifikat_ukk?.reason || 'Belum memenuhi syarat'}`
                            );
                            return;
                          }
                          onPrintSertifikatUkk?.(student);
                        }}
                        className={cn(
                          'h-7 px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap rounded-lg',
                          isUkkEligible
                            ? 'border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/50 cursor-pointer'
                            : 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
                        )}
                        title={
                          isUkkEligible
                            ? 'Cetak Sertifikat Uji Kompetensi Keahlian'
                            : `🔒 Terkunci: ${elig?.sertifikat_ukk?.reason || 'Belum memenuhi syarat'}`
                        }
                      >
                        <Award className="w-3 h-3 mr-0.5 text-orange-600 dark:text-orange-400" />
                        <span>UKK</span>
                        {!isUkkEligible && (
                          <Lock className="w-2.5 h-2.5 ml-0.5 text-amber-500 shrink-0" />
                        )}
                      </Button>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-slate-600">-</span>
                    )}
                  </td>

                  {/* Slot 8: Berkas Kelulusan (SKL & Transkrip) */}
                  <td className="py-2 px-2 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1 flex-nowrap">
                      {/* SKL */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!isSklEligible) {
                            toast.warning(
                              `SKL: ${elig?.skl?.reason || 'Belum memenuhi syarat kelulusan'}`
                            );
                            return;
                          }
                          onPrintSkl?.(student.id);
                        }}
                        className={cn(
                          'h-7 px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap rounded-lg',
                          isSklEligible
                            ? 'border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer'
                            : 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
                        )}
                        title={
                          isSklEligible
                            ? 'Cetak Surat Keterangan Lulus Resmi'
                            : `🔒 Terkunci: ${elig?.skl?.reason || 'Belum memenuhi syarat'}`
                        }
                      >
                        <GraduationCap className="w-3 h-3 mr-0.5 text-rose-600 dark:text-rose-400" />
                        <span>SKL</span>
                        {!isSklEligible && (
                          <Lock className="w-2.5 h-2.5 ml-0.5 text-amber-500 shrink-0" />
                        )}
                      </Button>

                      {/* Transkrip Nilai */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!isTranskripEligible) {
                            toast.warning(
                              `Transkrip Nilai: ${elig?.transkrip?.reason || 'Belum memenuhi syarat'}`
                            );
                            return;
                          }
                          onOpenTranskrip?.(student);
                        }}
                        className={cn(
                          'h-7 px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap rounded-lg',
                          isTranskripEligible
                            ? 'border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer'
                            : 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
                        )}
                        title={
                          isTranskripEligible
                            ? 'Pratinjau & Cetak Transkrip Nilai Kumulatif'
                            : `🔒 Terkunci: ${elig?.transkrip?.reason || 'Belum memenuhi syarat'}`
                        }
                      >
                        <Award className="w-3 h-3 mr-0.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Transkrip</span>
                        {!isTranskripEligible && (
                          <Lock className="w-2.5 h-2.5 ml-0.5 text-amber-500 shrink-0" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    )}
  </div>
  );
});

AcademicOrchestratorTable.displayName = 'AcademicOrchestratorTable';
