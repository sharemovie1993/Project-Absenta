import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  getWaParticipatingGroups,
  getKbmNotificationConfig,
  saveKbmNotificationConfig,
  type WaGroupInfo,
  type KbmNotificationConfig,
} from '@/api/whatsapp.api';
import { Button, Loader, Alert, AlertTitle, AlertDescription } from '@/components/ui';
import {
  Users,
  RefreshCw,
  Search,
  ShieldAlert,
  Copy,
  Check,
  MessageSquare,
  Megaphone,
  Camera,
  CheckCircle2,
  Sparkles,
  Settings2,
  BellRing,
} from 'lucide-react';
import { toast } from 'sonner';

interface WhatsappGroupsTabProps {
  localStatus: 'connected' | 'connecting' | 'disconnected' | null;
}

const WhatsappGroupsTab: React.FC<WhatsappGroupsTabProps> = ({ localStatus }) => {
  const [groups, setGroups] = useState<WaGroupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // KBM WhatsApp Notification Config state
  const [kbmConfig, setKbmConfig] = useState<KbmNotificationConfig>({
    isEnabled: false,
    groupJid: '',
    groupSubject: '',
    template: 'Saya *{{nama_guru}}* Telah Hadir di Kelas *{{nama_kelas}}*',
  });
  const [loadingKbmConfig, setLoadingKbmConfig] = useState(false);
  const [savingKbmConfig, setSavingKbmConfig] = useState(false);
  const [showTemplateConfig, setShowTemplateConfig] = useState(false);

  const fetchKbmConfig = useCallback(async () => {
    try {
      setLoadingKbmConfig(true);
      const res = await getKbmNotificationConfig();
      if (res.success && res.data) {
        setKbmConfig(res.data);
      }
    } catch (_) {
      // ignore
    } finally {
      setLoadingKbmConfig(false);
    }
  }, []);

  const fetchGroups = useCallback(async (refresh = false) => {
    if (localStatus !== 'connected') {
      setGroups([]);
      setErrorMsg('Gateway WhatsApp belum terhubung. Silakan hubungkan WhatsApp terlebih dahulu di tab Koneksi.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await getWaParticipatingGroups(refresh);
      if (res.success && Array.isArray(res.data)) {
        setGroups(res.data);
      } else {
        setErrorMsg(res.message || 'Gagal memuat daftar grup.');
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Gagal terhubung ke gateway WA untuk mengambil grup.');
    } finally {
      setLoading(false);
    }
  }, [localStatus]);

  useEffect(() => {
    fetchGroups(false);
    fetchKbmConfig();
  }, [fetchGroups, fetchKbmConfig]);

  const handleCopyId = (groupId: string) => {
    navigator.clipboard.writeText(groupId);
    setCopiedId(groupId);
    toast.success('ID Grup berhasil disalin!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSetKbmGroup = async (group: WaGroupInfo) => {
    try {
      setSavingKbmConfig(true);
      const updated: KbmNotificationConfig = {
        ...kbmConfig,
        isEnabled: true,
        groupJid: group.id,
        groupSubject: group.subject,
      };
      await saveKbmNotificationConfig(updated);
      setKbmConfig(updated);
      toast.success(`Grup "${group.subject}" berhasil dijadikan target notifikasi buka sesi KBM!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan target grup KBM.');
    } finally {
      setSavingKbmConfig(false);
    }
  };

  const handleRemoveKbmGroup = async () => {
    try {
      setSavingKbmConfig(true);
      const updated: KbmNotificationConfig = {
        ...kbmConfig,
        isEnabled: false,
        groupJid: '',
        groupSubject: '',
      };
      await saveKbmNotificationConfig(updated);
      setKbmConfig(updated);
      toast.success('Target grup notifikasi KBM berhasil dinonaktifkan.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengubah konfigurasi.');
    } finally {
      setSavingKbmConfig(false);
    }
  };

  const handleToggleKbmEnabled = async (enabled: boolean) => {
    try {
      setSavingKbmConfig(true);
      const updated: KbmNotificationConfig = {
        ...kbmConfig,
        isEnabled: enabled,
      };
      await saveKbmNotificationConfig(updated);
      setKbmConfig(updated);
      toast.success(enabled ? 'Notifikasi grup KBM diaktifkan.' : 'Notifikasi grup KBM dinonaktifkan.');
    } catch (err: any) {
      toast.error('Gagal memperbarui status notifikasi KBM.');
    } finally {
      setSavingKbmConfig(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      setSavingKbmConfig(true);
      await saveKbmNotificationConfig(kbmConfig);
      toast.success('Template pesan notifikasi KBM berhasil disimpan.');
      setShowTemplateConfig(false);
    } catch (err: any) {
      toast.error('Gagal menyimpan template pesan.');
    } finally {
      setSavingKbmConfig(false);
    }
  };

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    const term = searchTerm.toLowerCase();
    return groups.filter(
      (g) => g.subject.toLowerCase().includes(term) || g.id.toLowerCase().includes(term)
    );
  }, [groups, searchTerm]);

  if (localStatus !== 'connected') {
    return (
      <div className="p-8 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-amber-900 dark:text-amber-300">WhatsApp Gateway Belum Terhubung</h3>
        <p className="text-xs text-amber-700 dark:text-amber-400 max-w-md mx-auto">
          Fitur pendeteksi grup WhatsApp memerlukan koneksi WhatsApp yang aktif. Silakan scan QR Code pada tab <strong>Koneksi</strong> untuk menghubungkan nomor WA sekolah.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── CARD NOTIFIKASI KBM KE GROUP WA ── */}
      <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 dark:from-emerald-950/30 dark:via-slate-900 dark:to-emerald-950/20 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Notifikasi Pembukaan Sesi KBM ke Grup WA
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Foto Kehadiran
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Kirim pesan otomatis & lampiran foto kegiatan setiap kali guru atau siswa membuka sesi KBM ke grup yang ditentukan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTemplateConfig(!showTemplateConfig)}
              className="h-9 px-3 rounded-xl font-medium text-xs gap-1.5 border-slate-300 dark:border-slate-700"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Format Pesan</span>
            </Button>

            {kbmConfig.groupJid && (
              <Button
                type="button"
                variant={kbmConfig.isEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleToggleKbmEnabled(!kbmConfig.isEnabled)}
                disabled={savingKbmConfig}
                className={`h-9 px-3.5 rounded-xl font-bold text-xs gap-1.5 transition-all ${
                  kbmConfig.isEnabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'text-slate-600 border-slate-300'
                }`}
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>{kbmConfig.isEnabled ? 'Notif Aktif' : 'Notif Mati'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Selected Group Indicator */}
        <div className="p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-500/5 dark:bg-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Grup Tujuan Notifikasi: </span>
              {kbmConfig.groupJid ? (
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  {kbmConfig.groupSubject || kbmConfig.groupJid}
                </span>
              ) : (
                <span className="font-semibold text-amber-600 dark:text-amber-400 italic">
                  Belum ditentukan (Klik tombol "Jadikan Target Notif KBM" pada salah satu grup di bawah)
                </span>
              )}
            </div>
          </div>

          {kbmConfig.groupJid && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveKbmGroup}
              disabled={savingKbmConfig}
              className="h-7 px-2 text-[11px] text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
            >
              Lepas Target
            </Button>
          )}
        </div>

        {/* Collapsible Template Editor */}
        {showTemplateConfig && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Format Teks Caption Pesan WA (Foto akan dilampirkan otomatis):
              </label>
              <span className="text-[10px] text-slate-400">
                Variabel: <code className="text-emerald-600 dark:text-emerald-400">{'{{tag_guru}}'}</code>, <code className="text-emerald-600 dark:text-emerald-400">{'{{nama_guru}}'}</code>, <code className="text-emerald-600 dark:text-emerald-400">{'{{nama_kelas}}'}</code>, <code className="text-emerald-600 dark:text-emerald-400">{'{{ruangan}}'}</code>, <code className="text-emerald-600 dark:text-emerald-400">{'{{nama_mapel}}'}</code>, <code className="text-emerald-600 dark:text-emerald-400">{'{{jam_ke}}'}</code>, <code className="text-emerald-600 dark:text-emerald-400">{'{{jam_jadwal}}'}</code>, <code className="text-emerald-600 dark:text-emerald-400">{'{{status_ketepatan}}'}</code>, <code className="text-emerald-600 dark:text-emerald-400">{'{{topik_materi}}'}</code>, <code className="text-emerald-600 dark:text-emerald-400">{'{{status_pengajar}}'}</code>
              </span>
            </div>
            <textarea
              rows={8}
              value={kbmConfig.template ?? ''}
              onChange={(e) => setKbmConfig({ ...kbmConfig, template: e.target.value })}
              placeholder={`📸 *LOG KEHADIRAN KBM KELAS*\n\nSaya {{tag_guru}} telah hadir dan membuka sesi pembelajaran.\n\n🏫 *Kelas:* {{nama_kelas}} ({{ruangan}})\n📚 *Mata Pelajaran:* {{nama_mapel}}\n⏰ *Jam Pelajaran:* Jam ke-{{jam_ke}} ({{jam_jadwal}} WIB)\n⏱️ *Status Waktu:* {{status_ketepatan}}\n📖 *Materi:* {{topik_materi}}\n👥 *Status Pengajar:* {{status_pengajar}}\n\n_Sistem Presensi Terpadu Absenta_`}
              className="w-full p-2.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />

            {/* Toggle Tag Guru */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tag / Mention Nomor WA Guru di Grup (@)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Secara otomatis me-mention (@) nomor HP guru agar guru mendapat notifikasi langsung di aplikasi WhatsApp.
                </span>
              </div>
              <Switch
                checked={kbmConfig.isTagGuru ?? true}
                onCheckedChange={(checked) => setKbmConfig({ ...kbmConfig, isTagGuru: checked })}
              />
            </div>

            <div className="flex justify-between items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setKbmConfig({
                    ...kbmConfig,
                    template: `📸 *LOG KEHADIRAN KBM KELAS*\n\nSaya {{tag_guru}} telah hadir dan membuka sesi pembelajaran.\n\n🏫 *Kelas:* {{nama_kelas}} ({{ruangan}})\n📚 *Mata Pelajaran:* {{nama_mapel}}\n⏰ *Jam Pelajaran:* Jam ke-{{jam_ke}} ({{jam_jadwal}} WIB)\n⏱️ *Status Waktu:* {{status_ketepatan}}\n📖 *Materi:* {{topik_materi}}\n👥 *Status Pengajar:* {{status_pengajar}}\n\n_Sistem Presensi Terpadu Absenta_`,
                  })
                }
                className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline font-medium"
              >
                Gunakan Format Lengkap (Standar Kurikulum & Kepsek)
              </button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplateConfig(false)}
                  className="h-8 px-3 text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveTemplate}
                  disabled={savingKbmConfig}
                  className="h-8 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Simpan Format
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Header Card for Groups */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              Daftar Grup WhatsApp Tertaut
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white">
                {groups.length} Grup
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pilih grup untuk dijadikan penerima notifikasi kehadiran guru & pembukaan sesi KBM
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => fetchGroups(true)}
          disabled={loading}
          variant="outline"
          size="sm"
          className="h-10 px-4 rounded-xl font-bold text-xs gap-2 shrink-0 border-blue-200 dark:border-blue-800 hover:bg-blue-100/50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </Button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <Alert className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
          <AlertTitle className="text-red-700 dark:text-red-400 font-bold">Gagal Mengambil Grup</AlertTitle>
          <AlertDescription className="text-xs text-red-600 dark:text-red-300">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Search Input */}
      {groups.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama grup atau ID grup..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      )}

      {/* Group List Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader size="md" />
          <span className="ml-3 text-xs font-semibold text-slate-500">Mendeteksi grup WhatsApp...</span>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
          <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {searchTerm ? 'Grup Tidak Ditemukan' : 'Tidak Ada Grup WhatsApp'}
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm
              ? 'Tidak ada grup yang cocok dengan kata kunci pencarian Anda.'
              : 'Nomor WhatsApp ini belum terdaftar di grup WhatsApp manapun.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGroups.map((group) => {
            const isSelectedKbmGroup = kbmConfig.groupJid === group.id;

            return (
              <div
                key={group.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  isSelectedKbmGroup
                    ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/30'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                          isSelectedKbmGroup
                            ? 'bg-emerald-500 text-white border-emerald-600'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {group.subject.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                            {group.subject}
                          </h4>
                          {isSelectedKbmGroup && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> Target KBM
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{group.participantsCount} Anggota</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {group.announce && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <Megaphone className="w-2.5 h-2.5" /> Pengumuman (Admin Only)
                      </span>
                    )}
                    {group.isCommunity && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                        Komunitas
                      </span>
                    )}
                  </div>
                </div>

                {/* Group Action & ID Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono text-slate-400 truncate" title={group.id}>
                      ID: {group.id}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyId(group.id)}
                      className="h-7 px-2 text-[11px] text-slate-500 hover:text-blue-600 gap-1 rounded-lg"
                    >
                      {copiedId === group.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500 font-bold">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Salin ID</span>
                        </>
                      )}
                    </Button>

                    {isSelectedKbmGroup ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveKbmGroup}
                        disabled={savingKbmConfig}
                        className="h-7 px-2.5 text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                      >
                        Lepas
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSetKbmGroup(group)}
                        disabled={savingKbmConfig}
                        className="h-7 px-2.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 shadow-sm"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Pilih untuk KBM</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WhatsappGroupsTab;

