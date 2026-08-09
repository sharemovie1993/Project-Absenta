import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Bell,
  Clock,
  Users,
  Send,
  CheckCircle,
  X,
  RefreshCw,
  Info,
  ShieldCheck,
  Moon,
  Sun
} from 'lucide-react';
import { piketGuruApi } from '../../api/piketGuru.api';

interface PiketNotifModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PiketNotifModal: React.FC<PiketNotifModalProps> = React.memo(({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // State Config
  const [enabled, setEnabled] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState('');
  const [targetGroupName, setTargetGroupName] = useState('');
  const [nightEnabled, setNightEnabled] = useState(true);
  const [nightTime, setNightTime] = useState('23:00');
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [morningTime, setMorningTime] = useState('05:00');

  // List WA Groups
  const [groups, setGroups] = useState<Array<{ id: string; subject: string; participantsCount: number }>>([]);
  const [isManualGroup, setIsManualGroup] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await piketGuruApi.getNotifConfig();
      if (res.success && res.data) {
        const { config, groups: groupList } = res.data;
        setEnabled(Boolean(config.enabled));
        setTargetGroupId(config.targetGroupId || '');
        setTargetGroupName(config.targetGroupName || '');
        setNightEnabled(config.nightEnabled ?? true);
        setNightTime(config.nightTime || '23:00');
        setMorningEnabled(config.morningEnabled ?? true);
        setMorningTime(config.morningTime || '05:00');

        setGroups(groupList || []);

        // Jika group ID tidak ada di list terdeteksi, aktifkan mode manual
        if (config.targetGroupId && groupList && !groupList.some(g => g.id === config.targetGroupId)) {
          setIsManualGroup(true);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuat konfigurasi notifikasi piket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (enabled && !targetGroupId) {
      toast.error('Silakan pilih atau isi Group WhatsApp Tujuan');
      return;
    }

    setSaving(true);
    try {
      const res = await piketGuruApi.saveNotifConfig({
        enabled,
        targetGroupId,
        targetGroupName,
        nightEnabled,
        nightTime,
        morningEnabled,
        morningTime
      });

      if (res.success) {
        toast.success('Pengaturan notifikasi WA piket guru berhasil disimpan!');
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async (isNight: boolean) => {
    if (!targetGroupId) {
      toast.error('Silakan tentukan Group WhatsApp Tujuan terlebih dahulu');
      return;
    }

    setTesting(true);
    try {
      const res = await piketGuruApi.testNotif({
        isNightReminder: isNight,
        overrideTargetGroupId: targetGroupId
      });

      if (res.success) {
        toast.success('✅ Pesan pengingat piket berhasil dikirim ke Grup WA!');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Gagal mengirim pesan pengujian');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
        
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-linear-to-r from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Pengaturan Notifikasi WA Group Piket
              </h3>
              <p className="text-xs text-slate-5-500 dark:text-slate-400">
                Otomatisasi pengiriman pengingat jadwal piket guru ke Grup WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-xs">Memuat data grup & konfigurasi WA...</p>
            </div>
          ) : (
            <>
              {/* MASTER TOGGLE SWITCH */}
              <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      Aktifkan Notifikasi Piket Otomatis
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Kirim jadwal piket guru secara otomatis ke Grup WA sesuai jadwal
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* BAGIAN 1: GROUP MAPPING */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
                    <span>Group WhatsApp Tujuan</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsManualGroup(!isManualGroup)}
                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {isManualGroup ? ' Pilih dari Daftar Grup' : ' Input Manual ID'}
                  </button>
                </div>

                {!isManualGroup ? (
                  <div>
                    <select
                      className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 p-3 focus:ring-2 focus:ring-indigo-500"
                      value={targetGroupId}
                      onChange={e => {
                        const selId = e.target.value;
                        setTargetGroupId(selId);
                        const found = groups.find(g => g.id === selId);
                        if (found) setTargetGroupName(found.subject);
                      }}
                    >
                      <option value="">-- Pilih Grup WhatsApp Sekolah --</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>
                          👥 {g.subject} ({g.participantsCount} Anggota)
                        </option>
                      ))}
                    </select>
                    {groups.length === 0 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                        <Info size={12} /> Belum ada Grup WA yang terdeteksi dari Baileys. Gunakan "Input Manual ID".
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Masukkan Group JID (misal: 120363xxx@g.us)"
                      className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 p-3 focus:ring-2 focus:ring-indigo-500 font-mono"
                      value={targetGroupId}
                      onChange={e => setTargetGroupId(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Nama Label Grup (opsional, misal: GURU & STAF)"
                      className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 p-3 focus:ring-2 focus:ring-indigo-500"
                      value={targetGroupName}
                      onChange={e => setTargetGroupName(e.target.value)}
                    />
                  </div>
                )}

                {targetGroupId && (
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] flex items-center justify-between font-mono">
                    <span>ID: {targetGroupId}</span>
                    <span className="font-sans font-semibold text-indigo-600 dark:text-indigo-400">
                      {targetGroupName || 'Grup WhatsApp'}
                    </span>
                  </div>
                )}
              </div>

              {/* BAGIAN 2: SCHEDULER WAKTU PENGIRIMAN */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Jadwal Jam Pengiriman Reminders</span>
                </label>

                {/* NIGHT REMINDER */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={nightEnabled}
                        onChange={e => setNightEnabled(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Moon size={15} className="text-indigo-500" />
                      <span>Pengingat Malam Hari (Jadwal Besok)</span>
                    </label>
                    <input
                      type="text"
                      value={nightTime}
                      onChange={e => setNightTime(e.target.value)}
                      disabled={!nightEnabled}
                      className="w-20 text-center font-bold text-xs p-1.5 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                    Kirim jadwal guru bertugas piket untuk <strong>besok hari</strong> setiap pukul <strong>{nightTime} WIB</strong>.
                  </p>
                </div>

                {/* MORNING REMINDER */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={morningEnabled}
                        onChange={e => setMorningEnabled(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Sun size={15} className="text-amber-500" />
                      <span>Pengingat Pagi Hari (Jadwal Hari Ini)</span>
                    </label>
                    <input
                      type="text"
                      value={morningTime}
                      onChange={e => setMorningTime(e.target.value)}
                      disabled={!morningEnabled}
                      className="w-20 text-center font-bold text-xs p-1.5 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                    Kirim jadwal guru bertugas piket untuk <strong>hari ini</strong> setiap pukul <strong>{morningTime} WIB</strong>.
                  </p>
                </div>
              </div>

              {/* TEST BUTTONS */}
              <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Send size={13} />
                    <span>Uji Coba Pengiriman Instan ke Group</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Uji coba langsung mengirimkan pesan pengingat ke Grup WA terpilih tanpa menunggu jam otomatis.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={testing || !targetGroupId}
                    onClick={() => handleTestSend(true)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold hover:bg-indigo-100 transition disabled:opacity-50"
                  >
                    {testing ? <RefreshCw size={13} className="animate-spin" /> : <Moon size={13} />}
                    <span>Test Kirim (Pengingat Besok)</span>
                  </button>
                  <button
                    type="button"
                    disabled={testing || !targetGroupId}
                    onClick={() => handleTestSend(false)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-semibold hover:bg-amber-100 transition disabled:opacity-50"
                  >
                    {testing ? <RefreshCw size={13} className="animate-spin" /> : <Sun size={13} />}
                    <span>Test Kirim (Pengingat Hari Ini)</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={saving || loading}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={15} />}
            <span>Simpan Pengaturan</span>
          </button>
        </div>

      </div>
    </div>
  );
});
