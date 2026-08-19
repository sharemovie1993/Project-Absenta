import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { updateTenant } from '../../../api/tenants.api';
import { Modal, Button, Label } from '../../ui';

interface GateScheduleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string;
  initialJamMasuk?: string;
  initialJamPulang?: string;
  initialToleransi?: number;
  onSaved?: () => void;
}

export const GateScheduleConfigModal: React.FC<GateScheduleConfigModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  initialJamMasuk = '07:00',
  initialJamPulang = '15:00',
  initialToleransi = 15,
  onSaved,
}) => {
  const [jamMasuk, setJamMasuk] = useState(initialJamMasuk);
  const [jamPulang, setJamPulang] = useState(initialJamPulang);
  const [toleransi, setToleransi] = useState(initialToleransi);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setJamMasuk(initialJamMasuk || '07:00');
      setJamPulang(initialJamPulang || '15:00');
      setToleransi(initialToleransi ?? 15);
    }
  }, [isOpen, initialJamMasuk, initialJamPulang, initialToleransi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      toast.error('Tenant ID tidak ditemukan');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateTenant(tenantId, {
        jam_masuk_default: jamMasuk,
        jam_pulang_default: jamPulang,
        toleransi_keterlambatan_menit: Number(toleransi),
      } as any);

      if (res.success || res.data) {
        toast.success('Pengaturan jam gerbang berhasil diperbarui!');
        if (onSaved) onSaved();
        onClose();
      } else {
        toast.error((res as any)?.message || 'Gagal menyimpan pengaturan');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal memperbarui jam gerbang');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pengaturan Jam Gerbang Sekolah"
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs">
          <ShieldCheck className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            Pengaturan ini menentukan batas jam keterlambatan dan jam kepulangan siswa di seluruh terminal pos gerbang.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Jam Masuk Gerbang
            </Label>
            <div className="relative">
              <input
                type="time"
                value={jamMasuk}
                onChange={(e) => setJamMasuk(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400">Batas awal penutupan gerbang.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Jam Pulang Gerbang
            </Label>
            <div className="relative">
              <input
                type="time"
                value={jamPulang}
                onChange={(e) => setJamPulang(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400">Jam gerbang mulai dibuka pulang.</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Toleransi Keterlambatan (Menit)
          </Label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={120}
              value={toleransi}
              onChange={(e) => setToleransi(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              placeholder="15"
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Siswa yang tap setelah Jam Masuk + Menit Toleransi akan otomatis berstatus <b>Terlambat</b>.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
            className="text-xs font-bold"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <Save size={14} />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
