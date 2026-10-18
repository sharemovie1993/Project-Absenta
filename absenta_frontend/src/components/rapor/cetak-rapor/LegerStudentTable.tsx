import React, { useState, useRef, useEffect } from 'react';
import {
  Printer,
  FileText,
  Edit3,
  Loader2,
  Award,
  BookOpen,
  Building2,
  FileSpreadsheet,
  ChevronDown,
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
  tahunPelajaranNama?: string;
  semesterNama?: string;
  onOpenSummaryModal: (student: LegerStudent) => void;
  onPrintRapor?: (student: LegerStudent) => void;
  onPrintP5?: (student: LegerStudent) => void;
  onPrintRaporPkl?: (student: LegerStudent) => void;
  onPrintSertifikatPkl?: (student: LegerStudent) => void;
  onPrintLeger?: () => void;
  onExportLeger?: () => void;
  onBatchPrintRapor?: () => void;
  isBatchPrinting?: boolean;
  onBatchPrintRaporPkl?: () => void;
  isBatchPklPrinting?: boolean;
  hasLegerData?: boolean;
  onOpenTranskripModal: (student: LegerStudent) => void;
  getPdfSklUrl?: (siswaId: string) => string;
  getPdfUkkUrl?: (siswaId: string) => string;
  modeCetakRapor?: 'CP_ONLY' | 'SUMATIF_AND_CP' | 'SUMATIF_ONLY';
}

export const LegerStudentTable: React.FC<LegerStudentTableProps> = React.memo(({
  students,
  isLoading,
  isJenjangSmk,
  pdfLoading = {},
  tahunPelajaranId,
  semesterId,
  tahunPelajaranNama,
  semesterNama,
  onOpenSummaryModal,
  onPrintRapor,
  onPrintP5,
  onPrintRaporPkl,
  onPrintSertifikatPkl,
  onPrintLeger,
  onExportLeger,
  onBatchPrintRapor,
  isBatchPrinting = false,
  onBatchPrintRaporPkl,
  isBatchPklPrinting = false,
  hasLegerData = true,
  onOpenTranskripModal,
  getPdfSklUrl,
  getPdfUkkUrl,
  modeCetakRapor = 'CP_ONLY',
}) => {
  const [isBatchMenuOpen, setIsBatchMenuOpen] = useState(false);
  const batchMenuRef = useRef<HTMLDivElement>(null);

  // Close batch menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (batchMenuRef.current && !batchMenuRef.current.contains(event.target as Node)) {
        setIsBatchMenuOpen(false);
      }
    };
    if (isBatchMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBatchMenuOpen]);

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
      {/* Action Toolbar di atas header tabel sebelah kanan */}
      <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <span>Daftar Siswa</span>
          <Badge variant="outline" className="text-[10px] font-bold border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            {students.length} Siswa
          </Badge>
        </div>

        {/* Sisi Kanan: Cetak Sekaligus & Buku Leger */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Tombol Utama: Cetak Sekaligus */}
          {onBatchPrintRapor && (
            <Button
              onClick={onBatchPrintRapor}
              disabled={isBatchPrinting || !hasLegerData || isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition-all h-[36px] px-3.5 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer text-xs"
              title="Cetak seluruh rapor siswa sekelas dalam 1 file PDF gabungan"
            >
              {isBatchPrinting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>Cetak Sekaligus</span>
            </Button>
          )}

          {/* Dropdown Aksi Sekunder: Buku Leger */}
          {onPrintLeger && (
            <div className="relative inline-block text-left" ref={batchMenuRef}>
              <Button
                variant="outline"
                onClick={() => setIsBatchMenuOpen((prev) => !prev)}
                disabled={!hasLegerData || isLoading}
                className="border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl font-bold text-xs h-[36px] px-3 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Opsi cetak buku leger nilai, rapor PKL, dan ekspor excel sekelas"
              >
                <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Buku Leger</span>
                <ChevronDown className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 transition-transform ${isBatchMenuOpen ? 'rotate-180' : ''}`} />
              </Button>

              {isBatchMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-1 space-y-0.5">
                    {/* CETAK BUKU LEGER KELAS */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsBatchMenuOpen(false);
                        onPrintLeger();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <BookOpen size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-300">
                          Buku Leger
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Format resmi PDF
                        </div>
                      </div>
                    </button>

                    {/* EKSPOR EXCEL LEGER KELAS */}
                    {onExportLeger && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsBatchMenuOpen(false);
                          onExportLeger();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Printer size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                            Ekspor Excel
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            File spreadsheet (.xlsx)
                          </div>
                        </div>
                      </button>
                    )}
                  </div>

                  {isJenjangSmk && onBatchPrintRaporPkl && (
                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsBatchMenuOpen(false);
                          onBatchPrintRaporPkl();
                        }}
                        disabled={isBatchPklPrinting}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group disabled:opacity-50"
                      >
                        <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {isBatchPklPrinting ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-300">
                            Rapor PKL
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Kompilasi PDF PKL
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
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
              <th className="p-3.5 text-right pr-4">Aksi Cetak</th>
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
                        title="Isi presensi & catatan perkembangan siswa"
                      >
                        <Edit3 size={13} className="mr-1 flex-shrink-0 text-slate-500" />
                        <span>Catatan</span>
                      </Button>

                      {/* Dropdown Cetak Dokumen Rapor Lengkap (Termasuk Transkrip) */}
                      <RaporPrintMenu
                        studentId={student.id}
                        studentName={student.nama_siswa}
                        tahunPelajaranId={tahunPelajaranId}
                        semesterId={semesterId}
                        tahunPelajaranNama={tahunPelajaranNama}
                        semesterNama={semesterNama}
                        hasPkl={isJenjangSmk !== false}
                        hasUkk={isJenjangSmk !== false}
                        hasSkl={true}
                        showSumatifArchive={modeCetakRapor === 'SUMATIF_AND_CP' || modeCetakRapor === 'SUMATIF_ONLY'}
                        onPrintRaporPkl={() => onPrintRaporPkl?.(student)}
                        onPrintSertifikatPkl={() => onPrintSertifikatPkl?.(student)}
                        onOpenTranskrip={() => onOpenTranskripModal(student)}
                      />
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
