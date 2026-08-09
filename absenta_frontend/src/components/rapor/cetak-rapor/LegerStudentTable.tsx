import React from 'react';
import {
  Printer,
  FileText,
  Edit3,
  Loader2,
  Award,
  BookOpen,
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { LegerStudent } from '../../../types/cetakRapor.types';

interface LegerStudentTableProps {
  students: LegerStudent[];
  isLoading: boolean;
  isJenjangSmk: boolean;
  pdfLoading: Record<string, boolean>;
  onOpenSummaryModal: (student: LegerStudent) => void;
  onPrintRapor: (student: LegerStudent) => void;
  onPrintP5: (student: LegerStudent) => void;
  onOpenTranskripModal: (student: LegerStudent) => void;
  getPdfSklUrl: (siswaId: string) => string;
  getPdfUkkUrl: (siswaId: string) => string;
}

export const LegerStudentTable: React.FC<LegerStudentTableProps> = React.memo(({
  students,
  isLoading,
  isJenjangSmk,
  pdfLoading,
  onOpenSummaryModal,
  onPrintRapor,
  onPrintP5,
  onOpenTranskripModal,
  getPdfSklUrl,
  getPdfUkkUrl,
}) => {
  if (isLoading) {
    return (
      <Card className="p-8 text-center bg-white dark:bg-slate-900 border-none shadow-xs">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
        <p className="text-xs font-semibold text-slate-400">Memuat matriks leger & data siswa...</p>
      </Card>
    );
  }

  if (!students || students.length === 0) {
    return (
      <Card className="p-8 text-center bg-white dark:bg-slate-900 border-none shadow-xs">
        <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-500">Tidak ada siswa ditemukan pada kelas ini.</p>
      </Card>
    );
  }

  return (
    <Card className="p-0 border-none shadow-xs overflow-hidden dark:bg-slate-900/40 w-full max-w-full min-w-0">
      <div className="overflow-x-auto w-full max-w-full min-w-0">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <th className="p-3.5 text-center w-12">Rank</th>
              <th className="p-3.5">Nama Siswa / NIS</th>
              <th className="p-3.5 text-center">Rata-Rata</th>
              <th className="p-3.5 text-center">Presensi (S/I/A)</th>
              <th className="p-3.5 text-center">Catatan Wali</th>
              <th className="p-3.5 text-right pr-4">Aksi Dokumen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {(students ?? []).map((student) => {
              const isRaporLoading = !!pdfLoading[`rapor_${student.id}`];
              const isP5Loading = !!pdfLoading[`p5_${student.id}`];

              return (
                <tr
                  key={student.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Rank */}
                  <td className="p-3.5 text-center font-black text-slate-700 dark:text-slate-200">
                    <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 font-black border-slate-300 text-slate-700 dark:text-slate-200 text-xs">
                      #{student.rank}
                    </Badge>
                  </td>

                  {/* Siswa */}
                  <td className="p-3.5">
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {student.nama_siswa}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      NIS: {student.nis}
                    </div>
                  </td>

                  {/* Rata-Rata Rapor */}
                  <td className="p-3.5 text-center font-black text-indigo-600 dark:text-indigo-400 text-sm">
                    {student.rata_rata || '0'}
                  </td>

                  {/* Presensi */}
                  <td className="p-3.5 text-center">
                    <span className="font-semibold text-slate-600 dark:text-slate-300 text-xs">
                      <span className="text-amber-600 font-bold">{student.sakit}</span> /{' '}
                      <span className="text-blue-600 font-bold">{student.izin}</span> /{' '}
                      <span className="text-rose-600 font-bold">{student.alpa}</span>
                    </span>
                  </td>

                  {/* Catatan Wali Kelas */}
                  <td className="p-3.5 text-center max-w-[200px] truncate">
                    {student.catatan_wali ? (
                      <span className="text-slate-700 dark:text-slate-300 text-[11px] italic truncate block">
                        "{student.catatan_wali}"
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600 text-[10px]">Belum diisi</span>
                    )}
                  </td>

                  {/* Action Group */}
                  <td className="p-3.5 text-right pr-4">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {/* Absensi & Catatan */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenSummaryModal(student)}
                        className="text-xs font-bold border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 whitespace-nowrap flex-shrink-0"
                      >
                        <Edit3 size={13} className="mr-1 flex-shrink-0" />
                        <span className="hidden sm:inline">ABSENSI & CATATAN</span>
                        <span className="sm:hidden">CATATAN</span>
                      </Button>

                      {/* RAPOR (PDF) */}
                      <Button
                        size="sm"
                        onClick={() => onPrintRapor(student)}
                        disabled={isRaporLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-60 whitespace-nowrap flex-shrink-0"
                      >
                        {isRaporLoading ? (
                          <Loader2 size={13} className="animate-spin mr-1" />
                        ) : (
                          <Printer size={13} className="mr-1" />
                        )}
                        RAPOR (PDF)
                      </Button>

                      {/* P5 (PDF) */}
                      <Button
                        size="sm"
                        onClick={() => onPrintP5(student)}
                        disabled={isP5Loading}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-60 whitespace-nowrap flex-shrink-0"
                      >
                        {isP5Loading ? (
                          <Loader2 size={13} className="animate-spin mr-1" />
                        ) : (
                          <FileText size={13} className="mr-1" />
                        )}
                        P5 (PDF)
                      </Button>

                      {/* SKL */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getPdfSklUrl(student.id), '_blank')}
                        className="text-xs font-bold border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 whitespace-nowrap flex-shrink-0"
                      >
                        SKL
                      </Button>

                      {/* UKK — Khusus SMK */}
                      {isJenjangSmk && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(getPdfUkkUrl(student.id), '_blank')}
                          className="text-xs font-bold border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 whitespace-nowrap flex-shrink-0"
                        >
                          UKK
                        </Button>
                      )}

                      {/* TRANSKRIP */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenTranskripModal(student)}
                        className="text-xs font-bold border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 whitespace-nowrap flex-shrink-0"
                      >
                        <Award size={13} className="mr-1 flex-shrink-0" />
                        TRANSKRIP
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
});
