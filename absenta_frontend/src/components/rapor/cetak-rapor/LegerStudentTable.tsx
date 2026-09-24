import React from 'react';
import {
  Printer,
  FileText,
  Edit3,
  Loader2,
  Award,
  BookOpen,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { LegerStudent } from '../../../types/cetakRapor.types';
import { RaporPrintMenu } from '../../rapor/RaporPrintMenu';

interface LegerStudentTableProps {
  students: LegerStudent[];
  isLoading: boolean;
  isJenjangSmk: boolean;
  pdfLoading?: Record<string, boolean>;
  tahunPelajaranId?: string;
  semesterId?: string;
  onOpenSummaryModal: (student: LegerStudent) => void;
  onPrintRapor?: (student: LegerStudent) => void;
  onPrintP5?: (student: LegerStudent) => void;
  onPrintRaporPkl?: (student: LegerStudent) => void;
  onPrintSertifikatPkl?: (student: LegerStudent) => void;
  onPrintLeger?: () => void;
  onExportLeger?: () => void;
  onOpenTranskripModal: (student: LegerStudent) => void;
  getPdfSklUrl?: (siswaId: string) => string;
  getPdfUkkUrl?: (siswaId: string) => string;
}

export const LegerStudentTable: React.FC<LegerStudentTableProps> = React.memo(({
  students,
  isLoading,
  isJenjangSmk,
  pdfLoading = {},
  tahunPelajaranId,
  semesterId,
  onOpenSummaryModal,
  onPrintRapor,
  onPrintP5,
  onPrintRaporPkl,
  onPrintSertifikatPkl,
  onPrintLeger,
  onExportLeger,
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
    <Card className="p-0 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden dark:bg-slate-900/40 w-full max-w-full min-w-0">
      {/* Table Toolbar Header with Clear Leger Print & Export Buttons */}
      <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <BookOpen size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                Buku Leger Nilai &amp; Peringkat Kelas
              </span>
              <Badge variant="outline" className="bg-white dark:bg-slate-800 text-[10px] font-bold border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                {students.length} Siswa
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">
              Rekapitulasi nilai rapor intrakurikuler seluruh mata pelajaran dan urutan ranking rombel.
            </p>
          </div>
        </div>

        {/* Action Buttons for Leger */}
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {onPrintLeger && (
            <Button
              type="button"
              size="sm"
              onClick={onPrintLeger}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs h-8 px-3 flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Cetak Buku Leger Nilai Kelas format Landscape (PDF)"
            >
              <Printer size={13} />
              <span>Cetak Buku Leger (PDF)</span>
            </Button>
          )}

          {onExportLeger && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExportLeger}
              className="border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl font-bold text-xs h-8 px-3 flex items-center gap-1.5 cursor-pointer"
              title="Unduh Leger Nilai Kelas format Spreadsheet (.xlsx)"
            >
              <FileSpreadsheet size={13} />
              <span>Ekspor Excel</span>
            </Button>
          )}
        </div>
      </div>

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
              const isPklLoading = !!pdfLoading[`pkl_${student.id}`];

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

                  {/* Action Group (Opsi A: Clean Ergonomic Dropdown UI) */}
                  <td className="p-3.5 text-right pr-4">
                    <div className="flex items-center justify-end gap-2 flex-nowrap">
                      {/* Absensi & Catatan Wali Kelas */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenSummaryModal(student)}
                        className="text-xs font-semibold border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 whitespace-nowrap flex-shrink-0"
                      >
                        <Edit3 size={13} className="mr-1 flex-shrink-0 text-slate-500" />
                        <span>Catatan</span>
                      </Button>

                      {/* Dropdown Cetak Dokumen Rapor Lengkap */}
                      <RaporPrintMenu
                        studentId={student.id}
                        studentName={student.nama_siswa}
                        tahunPelajaranId={tahunPelajaranId}
                        semesterId={semesterId}
                        hasPkl={isJenjangSmk !== false}
                        hasUkk={isJenjangSmk !== false}
                        hasSkl={true}
                        onPrintRaporPkl={() => onPrintRaporPkl?.(student)}
                        onPrintSertifikatPkl={() => onPrintSertifikatPkl?.(student)}
                      />

                      {/* Transkrip Modal */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenTranskripModal(student)}
                        className="text-xs font-semibold border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 whitespace-nowrap flex-shrink-0"
                        title="Rekapitulasi Nilai & Transkrip Kumulatif"
                      >
                        <Award size={13} className="mr-1 flex-shrink-0" />
                        <span>Transkrip</span>
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
