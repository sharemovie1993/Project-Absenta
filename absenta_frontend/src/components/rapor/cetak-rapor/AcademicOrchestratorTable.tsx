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

export interface AcademicOrchestratorTableProps {
  students: LegerStudent[];
  isLoading?: boolean;
  isJenjangSmk?: boolean;
  pdfLoading?: Record<string, boolean>;
  modeCetakRapor?: 'CP_ONLY' | 'SUMATIF_AND_CP' | 'SUMATIF_ONLY';
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <Loader className="w-9 h-9 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Memuat Pangkalan Data Dokumen Akademik...
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Menyusun riwayat semester dan status kelayakan berkas tiap siswa
        </p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Tidak Ada Data Siswa Ditemukan
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
          Pilih rombel atau kelas lain pada bar navigasi atas untuk menampilkan berkas orkestrasi dokumen akademik.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-850 border-b border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-3 w-12 text-center">No</th>
              <th className="py-3.5 px-4 min-w-[220px]">Data & Identitas Siswa</th>
              <th className="py-3.5 px-3 min-w-[130px] text-center">Cover & Biodata</th>
              <th className="py-3.5 px-3 min-w-[160px] text-center">Rapor Semester (CK1-CK2)</th>
              {showSumatif && (
                <th className="py-3.5 px-3 min-w-[160px] text-center">Rapor Sumatif</th>
              )}
              <th className="py-3.5 px-3 min-w-[120px] text-center">Rapor P5</th>
              {isJenjangSmk && (
                <th className="py-3.5 px-3 min-w-[220px] text-center">Berkas PKL (DUDI)</th>
              )}
              <th className="py-3.5 px-3 min-w-[240px] text-center">Berkas Kelulusan</th>
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
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors"
                >
                  {/* 1. No */}
                  <td className="py-3 px-3 text-center font-bold text-slate-400">
                    {index + 1}
                  </td>

                  {/* 2. Identitas Siswa */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0">
                        {student.nama_siswa.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate text-xs">
                          {student.nama_siswa}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          NIS: {student.nis || '-'} {student.nisn ? `• NISN: ${student.nisn}` : ''}
                        </div>
                        {/* Badge Siswa Pindahan */}
                        {student.is_pindahan && (
                          <div
                            className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 text-[10px] font-semibold"
                            title={`Siswa pindahan dari: ${student.sekolah_asal || 'Sekolah lain'}`}
                          >
                            <ArrowRightLeft className="w-2.5 h-2.5" />
                            <span>Pindahan</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 3. Cover & Biodata */}
                  <td className="py-3 px-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPrintBiodata(student.id)}
                      className="text-xs font-semibold border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 whitespace-nowrap"
                      title="Cetak Cover & Biodata 17 Butir Siswa"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400" />
                      <span>Biodata</span>
                    </Button>
                  </td>

                  {/* 4. Rapor Semester (CK1-CK2) Dropdown Smart Sem 1-6 */}
                  <td className="py-3 px-3 text-center">
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

                  {/* 5. Rapor Sumatif Dropdown Smart */}
                  {showSumatif && (
                    <td className="py-3 px-3 text-center">
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
                    </td>
                  )}

                  {/* 6. Rapor P5 */}
                  <td className="py-3 px-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPrintP5(student.id)}
                      className="text-xs font-semibold border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 whitespace-nowrap"
                      title="Cetak Lembar Rapor Projek Penguatan Profil Pelajar Pancasila"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
                      <span>Rapor P5</span>
                    </Button>
                  </td>

                  {/* 7. Berkas PKL (Hanya SMK) */}
                  {isJenjangSmk && (
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 flex-nowrap">
                        {/* Rapor PKL */}
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
                            'text-xs font-semibold whitespace-nowrap',
                            isPklRaporEligible
                              ? 'border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50'
                              : 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
                          )}
                          title={
                            isPklRaporEligible
                              ? 'Cetak Rapor PKL Resmi'
                              : `🔒 Terkunci: ${elig?.rapor_pkl?.reason || 'Belum memenuhi syarat'}`
                          }
                        >
                          <Briefcase className="w-3.5 h-3.5 mr-1 text-purple-600 dark:text-purple-400" />
                          <span>Rapor PKL</span>
                          {!isPklRaporEligible && (
                            <Lock className="w-2.5 h-2.5 ml-1 text-amber-500 shrink-0" />
                          )}
                        </Button>

                        {/* Sertifikat PKL */}
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
                            'text-xs font-semibold whitespace-nowrap',
                            isPklSertifikatEligible
                              ? 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                              : 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
                          )}
                          title={
                            isPklSertifikatEligible
                              ? 'Cetak Sertifikat & Piagam PKL'
                              : `🔒 Terkunci: ${elig?.sertifikat_pkl?.reason || 'Belum memenuhi syarat'}`
                          }
                        >
                          <Award className="w-3.5 h-3.5 mr-1 text-amber-500" />
                          <span>Sertifikat PKL</span>
                          {!isPklSertifikatEligible && (
                            <Lock className="w-2.5 h-2.5 ml-1 text-amber-500 shrink-0" />
                          )}
                        </Button>
                      </div>
                    </td>
                  )}

                  {/* 8. Berkas Kelulusan (UKK, SKL, Transkrip) */}
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex items-center gap-1.5 flex-nowrap">
                      {/* Sertifikat UKK (Hanya SMK) */}
                      {isJenjangSmk && (
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
                            'text-xs font-semibold whitespace-nowrap',
                            isUkkEligible
                              ? 'border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/50'
                              : 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
                          )}
                          title={
                            isUkkEligible
                              ? 'Cetak Sertifikat Uji Kompetensi Keahlian'
                              : `🔒 Terkunci: ${elig?.sertifikat_ukk?.reason || 'Belum memenuhi syarat'}`
                          }
                        >
                          <Award className="w-3.5 h-3.5 mr-1 text-orange-600 dark:text-orange-400" />
                          <span>UKK</span>
                          {!isUkkEligible && (
                            <Lock className="w-2.5 h-2.5 ml-1 text-amber-500 shrink-0" />
                          )}
                        </Button>
                      )}

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
                          'text-xs font-semibold whitespace-nowrap',
                          isSklEligible
                            ? 'border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                            : 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
                        )}
                        title={
                          isSklEligible
                            ? 'Cetak Surat Keterangan Lulus Resmi'
                            : `🔒 Terkunci: ${elig?.skl?.reason || 'Belum memenuhi syarat'}`
                        }
                      >
                        <GraduationCap className="w-3.5 h-3.5 mr-1 text-rose-600 dark:text-rose-400" />
                        <span>SKL</span>
                        {!isSklEligible && (
                          <Lock className="w-2.5 h-2.5 ml-1 text-amber-500 shrink-0" />
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
                          'text-xs font-semibold whitespace-nowrap',
                          isTranskripEligible
                            ? 'border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
                            : 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
                        )}
                        title={
                          isTranskripEligible
                            ? 'Pratinjau & Cetak Transkrip Nilai Kumulatif'
                            : `🔒 Terkunci: ${elig?.transkrip?.reason || 'Belum memenuhi syarat'}`
                        }
                      >
                        <Award className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400" />
                        <span>Transkrip</span>
                        {!isTranskripEligible && (
                          <Lock className="w-2.5 h-2.5 ml-1 text-amber-500 shrink-0" />
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
  );
});

AcademicOrchestratorTable.displayName = 'AcademicOrchestratorTable';
