import React, { useState } from 'react';
import { 
  DownloadCloud, 
  Database, 
  Check, 
  Image, 
  Clock, 
  ShieldCheck, 
  FileArchive, 
  Loader2, 
  Sparkles 
} from 'lucide-react';
import { Modal, Button, Checkbox, Badge } from '@/components/ui';
import toast from 'react-hot-toast';
import { backupApi, type Backup } from '@/api/superadmin-backups.api';

interface ExportBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string;
  tenantName?: string;
}

export const ExportBundleModal: React.FC<ExportBundleModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  tenantName
}) => {
  const [includeAttendance, setIncludeAttendance] = useState(true);
  const [includeMedia, setIncludeMedia] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!tenantId) {
      toast.error('Tenant ID tidak valid');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Sedang mengemas database dan file media ke paket .absenta...');

    try {
      const blob = await backupApi.exportBundle(tenantId, {
        includeAttendance,
        includeMedia
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `absenta_migration_${tenantName || 'school'}_${timestamp}.absenta`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Paket migrasi .absenta berhasil diunduh!', { id: toastId });
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Gagal mengunduh paket cadangan', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isExporting && onClose()}
      title="Ekspor Paket Migrasi (.absenta)"
      size="md"
    >
      <div className="space-y-6 text-slate-700 dark:text-slate-300">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider block">UniFi / Omada Style Bundle</span>
            <p className="text-emerald-700 dark:text-emerald-400">
              Menghasilkan satu file arsip mandiri yang berisi seluruh tabel database sekolah, pengaturan, dan berkas foto dari Object Storage MinIO.
            </p>
          </div>
        </div>

        {tenantName && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Sekolah yang diekspor:</span>
            <Badge variant="outline" className="font-bold text-slate-900 dark:text-white">
              {tenantName}
            </Badge>
          </div>
        )}

        <div className="space-y-3">
          <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">Opsi Paket Data</span>
          
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-xl flex items-start gap-3">
            <input 
              type="checkbox" 
              id="chk-attendance"
              checked={includeAttendance}
              onChange={(e) => setIncludeAttendance(e.target.checked)}
              className="mt-1 rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="chk-attendance" className="text-xs cursor-pointer select-none">
              <span className="font-bold text-slate-900 dark:text-white block">Sertakan Riwayat Presensi & Aktivitas</span>
              <span className="text-slate-500">Mencakup log harian absensi siswa, guru, izin, dan jurnal mengajar.</span>
            </label>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-xl flex items-start gap-3">
            <input 
              type="checkbox" 
              id="chk-media"
              checked={includeMedia}
              onChange={(e) => setIncludeMedia(e.target.checked)}
              className="mt-1 rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="chk-media" className="text-xs cursor-pointer select-none">
              <span className="font-bold text-slate-900 dark:text-white block">Sertakan Berkas Media MinIO / S3</span>
              <span className="text-slate-500">Mencakup foto profil, foto absensi wajah, dokumen KTP/KK siswa, dan template sertifikat.</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isExporting}>
            Batal
          </Button>
          <Button 
            type="button" 
            variant="default" 
            onClick={handleExport} 
            disabled={isExporting} 
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
            {isExporting ? 'Mengompresi Arsip...' : 'Unduh Paket .absenta'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
