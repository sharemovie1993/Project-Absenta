import React, { useState } from 'react';
import { 
  Camera, 
  Database, 
  Loader2, 
  Layers, 
  CheckCircle2, 
  Server,
  Sparkles
} from 'lucide-react';
import { Modal, Button, Label, SearchableSelect } from '@/components/ui';
import toast from 'react-hot-toast';
import { backupApi } from '@/api/superadmin-backups.api';

interface CreateSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenants: Array<{ id: string; name: string; subdomain?: string }>;
}

export const CreateSnapshotModal: React.FC<CreateSnapshotModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  tenants
}) => {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('system');
  const [isCreating, setIsCreating] = useState(false);

  const tenantOptions = [
    { value: 'system', label: '⭐ System Platform (Baseline Master Data Murni)' },
    ...(tenants || []).map(t => ({
      value: t.id,
      label: `${t.name}${t.subdomain ? ` (${t.subdomain})` : ''}`
    }))
  ];

  const selectedTenantObj = selectedTenantId === 'system'
    ? { id: 'system', name: 'System Platform' }
    : tenants.find(t => t.id === selectedTenantId);

  const handleCreate = async () => {
    setIsCreating(true);
    const toastId = toast.loading(`Sedang mengemas dan membuat snapshot untuk ${selectedTenantObj?.name || 'Sistem'}...`);

    try {
      const res = await backupApi.createManualSnapshot(selectedTenantId);
      if (res.success) {
        toast.success(res.message || 'Snapshot cadangan berhasil dibuat!', { id: toastId });
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Gagal membuat snapshot cadangan', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal membuat snapshot', { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isCreating && onClose()}
      title="Buat Snapshot Cadangan Baru"
      className="max-w-md w-full"
      contentClassName="p-4 sm:p-5 w-full max-w-full min-w-0"
    >
      <div className="space-y-4 text-xs">
        {/* Info Header Banner */}
        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 rounded-xl flex items-start gap-2.5 text-blue-900 dark:text-blue-200">
          <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Pencadangan Instan Multi-Tier</span>
            <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
              Arsip akan dikemas rapi ke format <code className="font-mono font-bold bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded text-[10px]">.absenta</code>, disimpan ke MinIO Primer, dan otomatis direplikasi ke Tier 2 (LAN) serta Tier 3 (Cloudflare R2) jika aktif.
            </p>
          </div>
        </div>

        {/* Pilihan Target Sekolah / System */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Pilih Target Penyimpanan Snapshot <span className="text-rose-500">*</span>
          </Label>
          <SearchableSelect
            value={selectedTenantId}
            onChange={(val) => setSelectedTenantId(val)}
            options={tenantOptions}
            placeholder="-- Pilih Sekolah atau System --"
            searchPlaceholder="Cari sekolah atau pilih System..."
            className="w-full text-xs"
          />
          <p className="text-[10px] text-slate-400">
            {selectedTenantId === 'system'
              ? 'Mencadangkan master data global: RBAC, kebijakan, akun superadmin, dan seluruh preset kurikulum/sarpras nasional.'
              : 'Mencadangkan seluruh data operasional sekolah terpilih beserta foto siswa dan dokumen penting.'}
          </p>
        </div>

        {/* Ringkasan Node Penyimpanan */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Target Replikasi Penyimpanan
          </span>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-400 block text-[9px]">Tier 1</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">MinIO Primer</span>
            </div>
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-400 block text-[9px]">Tier 2</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">LAN Mirror</span>
            </div>
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-400 block text-[9px]">Tier 3</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">Cloudflare R2</span>
            </div>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isCreating}
            className="h-9 text-xs cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleCreate}
            disabled={!selectedTenantId || isCreating}
            className="h-9 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            {isCreating ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
            {isCreating ? 'Mengemas & Mengunggah...' : 'Buat Snapshot Sekarang'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
