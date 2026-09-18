import React, { useState, useEffect } from 'react';
import { 
  DownloadCloud, 
  Database, 
  Loader2, 
  Archive,
  School
} from 'lucide-react';
import { Modal, Button, Checkbox, Label } from '@/components/ui';
import toast from 'react-hot-toast';
import { backupApi } from '@/api/superadmin-backups.api';
import { getAllTenants } from '@/api/tenants.api';

interface ExportBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string;
  tenantName?: string;
  tenants?: Array<{ id: string; name: string }>;
}

export const ExportBundleModal: React.FC<ExportBundleModalProps> = ({
  isOpen,
  onClose,
  tenantId: initialTenantId,
  tenants: propTenants
}) => {
  const [tenantList, setTenantList] = useState<Array<{ id: string; name: string }>>(propTenants || []);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(initialTenantId || '');
  const [includeAttendance, setIncludeAttendance] = useState(true);
  const [includeMedia, setIncludeMedia] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTenantId) {
        setSelectedTenantId(initialTenantId);
      }
      // Load tenants if not provided or empty
      if (!propTenants || propTenants.length === 0) {
        setLoadingTenants(true);
        getAllTenants({ limit: 100 }, { skipTenantHeader: true })
          .then((res) => {
            if (res?.data) {
              const list = res.data.map(t => ({ id: t.id, name: t.name }));
              setTenantList(list);
              if (!selectedTenantId && list.length > 0) {
                setSelectedTenantId(list[0].id);
              }
            }
          })
          .catch(() => {})
          .finally(() => setLoadingTenants(false));
      } else {
        setTenantList(propTenants);
        if (!selectedTenantId && propTenants.length > 0) {
          setSelectedTenantId(propTenants[0].id);
        }
      }
    }
  }, [isOpen, initialTenantId, propTenants]);

  const selectedTenantObj = tenantList.find(t => t.id === selectedTenantId);

  const handleExport = async () => {
    if (!selectedTenantId) {
      toast.error('Pilih sekolah yang ingin diekspor terlebih dahulu');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Sedang mengemas database dan file media ke paket .absenta...');

    try {
      const blob = await backupApi.exportBundle(selectedTenantId, {
        includeAttendance,
        includeMedia
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      const safeName = (selectedTenantObj?.name || 'school').toLowerCase().replace(/[^a-z0-9]/g, '_');
      a.download = `absenta_migration_${safeName}_${timestamp}.absenta`;
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
      className="max-w-md"
      contentClassName="p-4 sm:p-6"
    >
      <div className="space-y-5 text-slate-700 dark:text-slate-300">
        {/* Info Banner */}
        <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-xl flex items-start gap-3">
          <Archive className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <span className="font-bold text-blue-950 dark:text-blue-200 block">Paket Mandiri (.absenta)</span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Membungkus database relasional, konfigurasi sekolah, dan seluruh berkas foto dari Object Storage MinIO ke dalam 1 file portabel.
            </p>
          </div>
        </div>

        {/* Dropdown Pemilihan Sekolah / Tenant */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <School size={13} className="text-slate-500" />
            <span>Pilih Sekolah / Tenant yang Diekspor</span>
            <span className="text-red-500">*</span>
          </Label>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            disabled={loadingTenants || isExporting}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {loadingTenants ? (
              <option value="">Memuat daftar sekolah...</option>
            ) : tenantList.length === 0 ? (
              <option value="">Tidak ada sekolah ditemukan</option>
            ) : (
              tenantList.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Opsi Paket Data */}
        <div className="space-y-2.5 pt-1">
          <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
            Kelengkapan Data
          </span>
          
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-start gap-3">
            <Checkbox
              id="chk-attendance"
              checked={includeAttendance}
              onCheckedChange={(c: boolean) => setIncludeAttendance(c)}
              className="mt-0.5"
            />
            <label htmlFor="chk-attendance" className="text-xs cursor-pointer select-none">
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                Sertakan Riwayat Presensi & Log
              </span>
              <span className="text-[11px] text-slate-500">
                Log harian absensi siswa, guru, rekap izin, dan jurnal KBM.
              </span>
            </label>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-start gap-3">
            <Checkbox
              id="chk-media"
              checked={includeMedia}
              onCheckedChange={(c: boolean) => setIncludeMedia(c)}
              className="mt-0.5"
            />
            <label htmlFor="chk-media" className="text-xs cursor-pointer select-none">
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                Sertakan Berkas Foto / Media MinIO
              </span>
              <span className="text-[11px] text-slate-500">
                Foto profil, foto absensi wajah, dan lampiran berkas dari storage MinIO.
              </span>
            </label>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onClose} 
            disabled={isExporting}
            className="h-9 text-xs cursor-pointer"
          >
            Batal
          </Button>
          <Button 
            type="button" 
            variant="default" 
            onClick={handleExport} 
            disabled={isExporting || !selectedTenantId} 
            className="h-9 text-xs font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
            {isExporting ? 'Mengompresi...' : 'Unduh Paket .absenta'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
