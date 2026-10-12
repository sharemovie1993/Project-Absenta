import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import {
  Bell,
  Send,
  RefreshCw,
  Clock,
  Users,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import {
  pembinaUpacaraApi,
  type UpacaraWaNotifConfig,
  type WaGroupOption,
} from '@/api/attendance/pembinaUpacara.api';
import { toast } from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PengaturanNotifUpacaraModal: React.FC<Props> = React.memo(({ isOpen, onClose }) => {
  const [config, setConfig] = useState<UpacaraWaNotifConfig>({
    enabled: false,
    targetGroupId: '',
    targetGroupName: '',
    seninJam: '06:00',
    seninEnabled: true,
    jumatReminderEnabled: true,
    jumatJam: '13:30',
    includeTema: true,
  });

  const [groups, setGroups] = useState<WaGroupOption[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Fetch initial config & groups
  useEffect(() => {
    if (!isOpen) return;

    const fetchConfig = async () => {
      setLoadingConfig(true);
      try {
        const res = await pembinaUpacaraApi.getWaConfig();
        if (res?.data) {
          setConfig(res.data);
        }
      } catch (err: any) {
        toast.error('Gagal memuat konfigurasi notifikasi upacara');
      } finally {
        setLoadingConfig(false);
      }
    };

    const fetchGroups = async (forceRefresh = false) => {
      setLoadingGroups(true);
      try {
        const res = await pembinaUpacaraApi.getWaGroups(forceRefresh);
        if (res?.data) {
          setGroups(res.data);
        }
      } catch (err: any) {
        // silent or toast
      } finally {
        setLoadingGroups(false);
      }
    };

    fetchConfig();
    fetchGroups(false);
  }, [isOpen]);

  const handleRefreshGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await pembinaUpacaraApi.getWaGroups(true);
      if (res?.data) {
        setGroups(res.data);
        toast.success(`Daftar grup WhatsApp berhasil diperbarui (${res.data.length} grup ditemukan)`);
      }
    } catch (err: any) {
      toast.error('Gagal menyinkronkan grup WhatsApp');
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Cari nama grup jika ada id terpilih
      const selectedGroup = groups.find((g) => g.id === config.targetGroupId);
      const payload: Partial<UpacaraWaNotifConfig> = {
        ...config,
        targetGroupName: selectedGroup?.name || selectedGroup?.subject || config.targetGroupName || '',
      };

      await pembinaUpacaraApi.saveWaConfig(payload);
      toast.success('Pengaturan notifikasi otomatis WhatsApp upacara berhasil disimpan!');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!config.targetGroupId) {
      toast.error('Pilih Group WhatsApp tujuan terlebih dahulu untuk uji coba.');
      return;
    }

    setTesting(true);
    try {
      const res = await pembinaUpacaraApi.testSendWa({ targetGroupId: config.targetGroupId });
      toast.success(res?.message || 'Uji coba pesan upacara berhasil dikirim ke grup!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengirim pesan uji coba');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pengaturan Otomasi Notifikasi WhatsApp Upacara"
      size="2xl"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Banner Info Alur Otomasi */}
        <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Sistem Notifikasi WhatsApp Kesiswaan 2-Tahap</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
            1. <strong>Hari Jum'at (Gladi/Latihan):</strong> Bot otomatis mengirim pesan pengingat personal ke nomor WA Guru Pembina & Wali Kelas Petugas.<br />
            2. <strong>Hari Senin Pagi (Hari H):</strong> Bot menyiarkan pengumuman resmi ke Group WA Dewan Guru lengkap dengan Pembina (Utama/Pengganti), Rombel Petugas, dan Tema Amanat.
          </p>
        </div>

        {/* Master Toggle Enabled */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Aktifkan Otomasi Notifikasi Upacara
            </div>
            <div className="text-xs text-slate-500">
              Jalankan pengiriman pesan berkala sesuai jadwal upacara bendera
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Target Group Dewan Guru */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              Group WhatsApp Dewan Guru (Siaran Hari H)
            </label>
            <button
              type="button"
              onClick={handleRefreshGroups}
              disabled={loadingGroups}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loadingGroups ? 'animate-spin' : ''}`} />
              Sinkronkan Grup WA
            </button>
          </div>

          <select
            value={config.targetGroupId || ''}
            onChange={(e) => setConfig((prev) => ({ ...prev, targetGroupId: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="">-- Pilih Group WhatsApp Dewan Guru --</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name || group.subject || group.id}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">
            Pesan upacara hari Senin akan dikirimkan ke grup ini secara otomatis.
          </p>
        </div>

        {/* Baris Konfigurasi Jadwal Jam */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Jadwal Hari Senin */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Siaran Hari Senin Pagi
              </span>
              <input
                type="checkbox"
                checked={config.seninEnabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, seninEnabled: e.target.checked }))}
                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> Jam Kirim Pengumuman:
              </label>
              <input
                type="time"
                value={config.seninJam}
                onChange={(e) => setConfig((prev) => ({ ...prev, seninJam: e.target.value }))}
                disabled={!config.seninEnabled}
                className="w-full px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 font-bold"
              />
              <span className="text-[10px] text-slate-400">Direkomendasikan: 06:00 WIB</span>
            </div>
          </div>

          {/* Jadwal Hari Jum'at */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                Pengingat Gladi Hari Jum'at
              </span>
              <input
                type="checkbox"
                checked={config.jumatReminderEnabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, jumatReminderEnabled: e.target.checked }))}
                className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> Jam Kirim ke Pembina & Wali:
              </label>
              <input
                type="time"
                value={config.jumatJam}
                onChange={(e) => setConfig((prev) => ({ ...prev, jumatJam: e.target.value }))}
                disabled={!config.jumatReminderEnabled}
                className="w-full px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 font-bold"
              />
              <span className="text-[10px] text-slate-400">Kirim japri setelah sholat Jum'at</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestSend}
            disabled={testing || !config.targetGroupId}
            className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 rounded-xl"
          >
            <Send className="w-3.5 h-3.5" />
            {testing ? 'Mengirim Uji Coba...' : 'Uji Coba Kirim ke Group Sekarang'}
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="rounded-xl">
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
              className="rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
});

PengaturanNotifUpacaraModal.displayName = 'PengaturanNotifUpacaraModal';
