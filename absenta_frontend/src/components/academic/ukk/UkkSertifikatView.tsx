import React, { useState, useMemo, useRef } from 'react';
import {
  Award,
  Download,
  ExternalLink,
  Printer,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  FileCheck2,
  Users,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { raporApi } from '@/api/rapor.api';
import { cn } from '@/lib/utils';

export interface UkkStudentItem {
  id: string;
  nama_siswa: string;
  nis?: string;
  kelas?: string;
  nomor_sertifikat?: string;
  predikat?: string;
  asesor_eksternal?: string;
  isCompleted?: boolean;
}

export interface UniversalUkkSertifikatViewProps {
  siswaId?: string;
  namaSiswa?: string;
  nomorSertifikat?: string;
  kelasId?: string;
  kelasNama?: string;
  jurusanId?: string;
  jurusanNama?: string;
  studentsList?: UkkStudentItem[];
  isModal?: boolean;
  hideLayout?: boolean;
  onClose?: () => void;
  className?: string;
}

export const UkkSertifikatView: React.FC<UniversalUkkSertifikatViewProps> = ({
  siswaId,
  namaSiswa,
  nomorSertifikat,
  kelasId,
  kelasNama,
  jurusanId,
  jurusanNama,
  studentsList = [],
  isModal = false,
  hideLayout = false,
  onClose,
  className = '',
}) => {
  // Normalize students list
  const allStudents = useMemo<UkkStudentItem[]>(() => {
    if (studentsList && studentsList.length > 0) {
      return studentsList;
    }
    if (siswaId) {
      return [
        {
          id: siswaId,
          nama_siswa: namaSiswa || 'Siswa',
          nomor_sertifikat: nomorSertifikat,
          kelas: kelasNama,
          isCompleted: true,
        },
      ];
    }
    return [];
  }, [studentsList, siswaId, namaSiswa, nomorSertifikat, kelasNama]);

  // Selected student index
  const initialIndex = useMemo(() => {
    if (!siswaId || allStudents.length === 0) return 0;
    const foundIdx = allStudents.findIndex((s) => s.id === siswaId);
    return foundIdx !== -1 ? foundIdx : 0;
  }, [siswaId, allStudents]);

  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [isBatchDownloading, setIsBatchDownloading] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentStudent = allStudents[currentIndex] || {
    id: siswaId || '',
    nama_siswa: namaSiswa || 'Siswa',
    nomor_sertifikat: nomorSertifikat,
    kelas: kelasNama,
  };

  const activeSiswaId = currentStudent.id;
  const pdfUrl = activeSiswaId ? raporApi.getPdfUkkUrl(activeSiswaId) : '';

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsLoadingPdf(true);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < allStudents.length - 1) {
      setIsLoadingPdf(true);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSelectStudent = (newId: string) => {
    const idx = allStudents.findIndex((s) => s.id === newId);
    if (idx !== -1 && idx !== currentIndex) {
      setIsLoadingPdf(true);
      setCurrentIndex(idx);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (err) {
        console.warn('Iframe print blocked by cross-origin, falling back to window.open', err);
      }
    }
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handleDownloadSingle = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `Sertifikat_UKK_${(currentStudent.nama_siswa || 'Siswa').replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleBatchDownload = async () => {
    if (allStudents.length === 0 || isBatchDownloading) return;
    setIsBatchDownloading(true);

    try {
      for (const student of allStudents) {
        const studentUrl = raporApi.getPdfUkkUrl(student.id);
        const a = document.createElement('a');
        a.href = studentUrl;
        a.download = `Sertifikat_UKK_${(student.nama_siswa || 'Siswa').replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Small delay to prevent browser download throttling
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    } catch (e) {
      console.error('Failed batch download:', e);
    } finally {
      setIsBatchDownloading(false);
    }
  };

  // Filter students if search query is entered
  const filteredStudents = useMemo(() => {
    if (!searchFilter.trim()) return allStudents;
    const q = searchFilter.toLowerCase();
    return allStudents.filter(
      (s) =>
        s.nama_siswa.toLowerCase().includes(q) ||
        s.nis?.toLowerCase().includes(q) ||
        s.nomor_sertifikat?.toLowerCase().includes(q)
    );
  }, [allStudents, searchFilter]);

  const getPredikatBadge = (predikat?: string) => {
    if (!predikat) return null;
    const upper = predikat.toUpperCase();
    if (upper.includes('SANGAT BAIK')) {
      return (
        <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
          {predikat}
        </Badge>
      );
    }
    if (upper.includes('BAIK')) {
      return (
        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/60 border-blue-300 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
          {predikat}
        </Badge>
      );
    }
    if (upper.includes('CUKUP')) {
      return (
        <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/60 border-amber-300 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
          {predikat}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[11px] font-bold">
        {predikat}
      </Badge>
    );
  };

  return (
    <div className={cn('flex flex-col w-full h-full space-y-3', className)}>
      {/* Universal Top Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Student Switcher & Info */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {allStudents.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="h-7 w-7 p-0 rounded-lg cursor-pointer disabled:opacity-30"
                title="Siswa Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2 min-w-[50px] text-center">
                {currentIndex + 1} / {allStudents.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentIndex === allStudents.length - 1}
                className="h-7 w-7 p-0 rounded-lg cursor-pointer disabled:opacity-30"
                title="Siswa Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Student Selector Dropdown if multi-student */}
          {allStudents.length > 1 ? (
            <select
              value={currentStudent.id}
              onChange={(e) => handleSelectStudent(e.target.value)}
              className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 max-w-[220px] sm:max-w-[280px] truncate cursor-pointer focus:ring-2 focus:ring-indigo-500"
            >
              {allStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_siswa} {s.nis ? `(${s.nis})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Award className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentStudent.nama_siswa}
              </span>
            </div>
          )}

          {/* Student Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {currentStudent.kelas && (
              <Badge variant="outline" className="text-[10px] font-bold border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                {currentStudent.kelas}
              </Badge>
            )}
            {getPredikatBadge(currentStudent.predikat)}
            {currentStudent.nomor_sertifikat && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                No: {currentStudent.nomor_sertifikat}
              </span>
            )}
          </div>
        </div>

        {/* Right: Print & Download Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsLoadingPdf(true);
              if (iframeRef.current) {
                iframeRef.current.src = pdfUrl;
              }
            }}
            className="h-8 px-2.5 text-xs font-semibold rounded-xl cursor-pointer"
            title="Muat ulang dokumen"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline ml-1">Reload</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(pdfUrl, '_blank')}
            className="h-8 px-3 text-xs font-semibold rounded-xl cursor-pointer"
            title="Buka sertifikat di tab baru browser"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-500 mr-1.5" />
            <span className="hidden sm:inline">Tab Baru</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 px-3 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 cursor-pointer"
            title="Cetak sertifikat"
          >
            <Printer className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200 mr-1.5" />
            <span>Cetak</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSingle}
            className="h-8 px-3 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 cursor-pointer"
            title="Unduh file PDF"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Unduh</span>
          </Button>

          {allStudents.length > 1 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleBatchDownload}
              disabled={isBatchDownloading}
              className="h-8 px-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
              title="Unduh seluruh sertifikat siswa di kelas ini"
            >
              {isBatchDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  <span>Mengunduh...</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  <span>Unduh Sekelas ({allStudents.length})</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main PDF Display Canvas */}
      <div
        className={cn(
          'relative w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 overflow-hidden shadow-inner',
          isModal ? 'h-[calc(92vh-150px)]' : 'h-[calc(100vh-220px)] min-h-[580px]'
        )}
      >
        {isLoadingPdf && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/85 dark:bg-slate-900/85 z-20 backdrop-blur-xs">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Merender Dokumen Sertifikat UKK Resmi...
            </p>
            <p className="text-[11px] text-slate-400">
              {currentStudent.nama_siswa} {currentStudent.nis ? `• NIS: ${currentStudent.nis}` : ''}
            </p>
          </div>
        )}

        {pdfUrl ? (
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            title={`Sertifikat UKK ${currentStudent.nama_siswa}`}
            onLoad={() => setIsLoadingPdf(false)}
            className="w-full h-full rounded-2xl bg-white dark:bg-slate-900 border-none"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <FileCheck2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Tidak Ada Siswa Terpilih
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Silakan pilih siswa pada tabel UKK atau daftar rombel untuk meninjau dan mencetak sertifikat.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
