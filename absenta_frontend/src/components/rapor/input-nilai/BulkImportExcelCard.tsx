import React, { memo } from 'react';
import { Download, Upload, FileSpreadsheet, FileOutput } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';

interface BulkImportExcelCardProps {
  onDownloadTemplate: () => void;
  onExportEraporKemendikbud?: () => void;
  excelFile: File | null;
  onFileChange: (file: File | null) => void;
  onUploadSubmit: (e: React.FormEvent) => void;
  isUploading: boolean;
}

export const BulkImportExcelCard: React.FC<BulkImportExcelCardProps> = memo(({
  onDownloadTemplate,
  onExportEraporKemendikbud,
  excelFile,
  onFileChange,
  onUploadSubmit,
  isUploading,
}) => {
  return (
    <div className="space-y-4">
      {/* Export e-Rapor Kemendikbud Card */}
      {onExportEraporKemendikbud && (
        <Card className="p-4 border-none shadow-sm bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white space-y-3 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-xl"></div>
          <div className="flex items-center gap-2 text-indigo-300">
            <FileOutput size={18} />
            <h3 className="font-bold text-xs uppercase tracking-wider">Export e-Rapor Kemendikbud</h3>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Unduh file Excel yang telah ter-format khusus sesuai skema impor aplikasi <strong>e-Rapor resmi Dinas Pendidikan</strong>.
          </p>
          <Button
            type="button"
            aria-label="Export Siap Impor e-Rapor Kemendikbud"
            onClick={onExportEraporKemendikbud}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl h-10 shadow-lg shadow-indigo-500/25"
          >
            <Download className="w-4 h-4 mr-2" />
            EXPORT SIAP IMPOR E-RAPOR
          </Button>
        </Card>
      )}

      {/* Download Template Excel Card */}
      <Card className="p-4 border-none shadow-sm dark:bg-slate-900/40 space-y-3">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
          <Download className="w-4 h-4" />
          <span>1. Format Template Excel</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Unduh berkas Excel resmi bermerek dengan gaya profesional dan petunjuk kolom terisi data siswa rombel saat ini.
        </p>
        <Button
          type="button"
          aria-label="Unduh format template Excel"
          onClick={onDownloadTemplate}
          variant="outline"
          className="w-full justify-center border-indigo-200 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-xs font-bold rounded-xl h-10"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          UNDUH TEMPLATE EXCEL
        </Button>
      </Card>

      {/* Upload Impor Excel Card */}
      <Card className="p-4 border-none shadow-sm dark:bg-slate-900/40 space-y-3">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
          <Upload className="w-4 h-4" />
          <span>2. Unggah & Impor Massal Excel</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Pilih berkas format Excel (.xlsx / .xls) yang telah diisi nilai siswa untuk diimpor secara instan.
        </p>

        <form onSubmit={onUploadSubmit} className="space-y-3">
          <label htmlFor="excel-file-input" className="sr-only">Pilih Berkas Excel Nilai</label>
          <input
            id="excel-file-input"
            aria-label="Pilih Berkas Excel Nilai"
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
          />

          <Button
            type="submit"
            aria-label="Unggah dan impor massal nilai dari Excel"
            disabled={!excelFile || isUploading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-11"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? 'MENGUNGGAH & MEMPROSES...' : 'IMPOR MASSAL NILAI'}
          </Button>
        </form>
      </Card>
    </div>
  );
});

BulkImportExcelCard.displayName = 'BulkImportExcelCard';
