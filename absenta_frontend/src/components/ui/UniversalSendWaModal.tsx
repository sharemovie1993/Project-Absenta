import React, { useEffect, useMemo, useState } from 'react';
import {
  MessageCircle,
  Send,
  Users,
  Phone,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Search,
  UserCheck,
  X,
  Check,
  Building2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from './Modal';
import { Button } from './Button';
import {
  getWaDocumentRecipients,
  getWaDocumentTargets,
  sendWaMessage,
  type WaDocumentRecipientItem,
  type WaDocumentTargetsResponse,
} from '@/api/whatsapp.api';
import { cn } from '@/lib/utils';

export type WaRecipientTab = 'GROUP' | 'GURU' | 'MANUAL';

export interface SelectedWaTarget {
  key: string;
  label: string;
  target: string; // phone digits or JID ending in @g.us
  badge: 'GROUP' | 'GURU' | 'MANUAL';
  subLabel?: string;
}

export interface UniversalSendWaModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  defaultMessage?: string;
  defaultRecipientType?: WaRecipientTab;
  defaultRecipientTarget?: string; // JID or phone
  defaultRecipientLabel?: string;
  onSuccess?: (details: { target: string; targetLabel: string; message: string }) => void;
}

export const UniversalSendWaModal: React.FC<UniversalSendWaModalProps> = ({
  isOpen,
  onClose,
  title = 'Kirim Pesan WhatsApp Gateway',
  subtitle = 'Kirim pengumuman, colek, atau notifikasi langsung via server WA Gateway sekolah',
  defaultMessage = '',
  defaultRecipientType = 'GROUP',
  defaultRecipientTarget,
  defaultRecipientLabel,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<WaRecipientTab>(defaultRecipientType);
  const [message, setMessage] = useState<string>(defaultMessage);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [manualPhone, setManualPhone] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<SelectedWaTarget | null>(null);

  const [targetsInfo, setTargetsInfo] = useState<WaDocumentTargetsResponse | null>(null);
  const [isLoadingTargets, setIsLoadingTargets] = useState<boolean>(false);

  const [directoryItems, setDirectoryItems] = useState<WaDocumentRecipientItem[]>([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState<boolean>(false);

  const [isSending, setIsSending] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Ambil daftar grup & status WA Gateway
  const fetchTargets = async (refresh = false) => {
    setIsLoadingTargets(true);
    try {
      const data = await getWaDocumentTargets(refresh);
      setTargetsInfo(data);
    } catch {
      setTargetsInfo({
        status: 'disconnected',
        connected: false,
        phoneNumber: null,
        groups: [],
      });
    } finally {
      setIsLoadingTargets(false);
    }
  };

  // Ambil direktori kontak guru jika tab guru dipilih
  const fetchDirectory = async (search = '') => {
    setIsLoadingDirectory(true);
    try {
      const items = await getWaDocumentRecipients({ type: 'GURU', search });
      setDirectoryItems(items);
    } catch {
      setDirectoryItems([]);
    } finally {
      setIsLoadingDirectory(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setMessage(defaultMessage || '');
    setActiveTab(defaultRecipientType);
    setSearchQuery('');
    setManualPhone('');
    setCopied(false);

    if (defaultRecipientTarget) {
      setSelectedTarget({
        key: defaultRecipientTarget,
        label: defaultRecipientLabel || defaultRecipientTarget,
        target: defaultRecipientTarget,
        badge: defaultRecipientType,
      });
    } else {
      setSelectedTarget(null);
    }

    void fetchTargets(false);
  }, [isOpen, defaultMessage, defaultRecipientType, defaultRecipientTarget, defaultRecipientLabel]);

  useEffect(() => {
    if (isOpen && activeTab === 'GURU') {
      void fetchDirectory(searchQuery);
    }
  }, [isOpen, activeTab, searchQuery]);

  const gatewayConnected = Boolean(
    targetsInfo?.gateway?.connected ||
      targetsInfo?.gateway?.externalActive ||
      targetsInfo?.connected
  );

  const gatewayNumber =
    targetsInfo?.gateway?.phoneNumber || targetsInfo?.phoneNumber || '';

  // Filter daftar grup
  const filteredGroups = useMemo(() => {
    const list = targetsInfo?.groups || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((g) => g.subject?.toLowerCase().includes(q));
  }, [targetsInfo?.groups, searchQuery]);

  // Handler pemilihan target
  const handleSelectGroup = (g: { id: string; subject: string; participantsCount?: number }) => {
    setSelectedTarget({
      key: g.id,
      label: g.subject || 'Grup WhatsApp',
      target: g.id,
      badge: 'GROUP',
      subLabel: g.participantsCount ? `${g.participantsCount} Anggota` : 'Grup Terhubung',
    });
  };

  const handleSelectGuru = (guru: WaDocumentRecipientItem) => {
    setSelectedTarget({
      key: guru.id,
      label: guru.name,
      target: guru.normalizedPhone || guru.phone,
      badge: 'GURU',
      subLabel: guru.phone,
    });
  };

  const handleApplyManualPhone = () => {
    const clean = manualPhone.replace(/\D/g, '');
    if (clean.length < 9) {
      toast.error('Masukkan nomor WhatsApp yang valid (minimal 9 digit)');
      return;
    }
    const formatted = clean.startsWith('0') ? `62${clean.slice(1)}` : clean.startsWith('62') ? clean : `62${clean}`;
    setSelectedTarget({
      key: formatted,
      label: `Nomor: +${formatted}`,
      target: formatted,
      badge: 'MANUAL',
    });
  };

  // Salin pesan ke clipboard
  const handleCopyMessage = () => {
    if (!message.trim()) return;
    try {
      navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Pesan berhasil disalin ke clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Gagal menyalin pesan');
    }
  };

  // Fallback: Buka via WhatsApp Web / App
  const handleOpenViaWhatsApp = () => {
    if (!message.trim()) {
      toast.error('Pesan tidak boleh kosong');
      return;
    }
    try {
      navigator.clipboard.writeText(message);
    } catch {}

    let waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    if (selectedTarget && !selectedTarget.target.includes('@g.us')) {
      const cleanDigits = selectedTarget.target.replace(/\D/g, '');
      const formatted = cleanDigits.startsWith('0') ? `62${cleanDigits.slice(1)}` : cleanDigits;
      waUrl = `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
    }

    window.open(waUrl, '_blank');
    toast.success('Membuka WhatsApp Web / App (pesan telah disalin)');
    if (onSuccess && selectedTarget) {
      onSuccess({
        target: selectedTarget.target,
        targetLabel: selectedTarget.label,
        message,
      });
    }
    onClose();
  };

  // Kirim langsung melalui server WA Gateway
  const handleSendViaGateway = async () => {
    if (!selectedTarget) {
      toast.error('Pilih grup atau nomor penerima terlebih dahulu');
      return;
    }
    if (!message.trim()) {
      toast.error('Pesan tidak boleh kosong');
      return;
    }

    setIsSending(true);
    try {
      const res = await sendWaMessage({
        to: selectedTarget.target,
        message: message.trim(),
        senderMode: 'GATEWAY',
      });

      if (res.success) {
        toast.success(res.message || `Pesan berhasil dikirim ke ${selectedTarget.label}!`);
        if (onSuccess) {
          onSuccess({
            target: selectedTarget.target,
            targetLabel: selectedTarget.label,
            message: message.trim(),
          });
        }
        onClose();
      } else {
        toast.error(res.message || 'Gagal mengirim pesan via WA Gateway');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Terjadi kesalahan pengiriman WA Gateway';
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="lg"
      className="p-0 overflow-hidden max-w-2xl"
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <MessageCircle size={18} />
              </div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                {title}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
              {subtitle}
            </p>
          </div>

          {/* Status Badge WA Gateway */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 bg-white dark:bg-slate-800 shadow-2xs">
            <span
              className={cn(
                'w-2 h-2 rounded-full shrink-0',
                gatewayConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              )}
            />
            <span className={gatewayConnected ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
              {gatewayConnected
                ? `Gateway Online${gatewayNumber ? ` (${gatewayNumber})` : ''}`
                : 'Gateway Terputus'}
            </span>
          </div>
        </div>

        {/* Body Modal */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* 1. Target Selector Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Pilih Penerima:</span>
              </label>

              {/* Tab Selector */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('GROUP');
                    if (selectedTarget && selectedTarget.badge !== 'GROUP') {
                      setSelectedTarget(null);
                    }
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1',
                    activeTab === 'GROUP'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  <Building2 size={12} />
                  <span>Grup WA</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('GURU');
                    if (selectedTarget && selectedTarget.badge !== 'GURU') {
                      setSelectedTarget(null);
                    }
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1',
                    activeTab === 'GURU'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  <UserCheck size={12} />
                  <span>Guru/Pegawai</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('MANUAL');
                    if (selectedTarget && selectedTarget.badge !== 'MANUAL') {
                      setSelectedTarget(null);
                    }
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1',
                    activeTab === 'MANUAL'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  <Phone size={12} />
                  <span>Nomor Manual</span>
                </button>
              </div>
            </div>

            {/* Currently Selected Pill */}
            {selectedTarget && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    <Check size={13} />
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 dark:text-slate-100 block truncate">
                      {selectedTarget.label}
                    </span>
                    {selectedTarget.subLabel && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                        {selectedTarget.subLabel}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTarget(null)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Ganti tujuan"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Content per Tab */}
            {!selectedTarget && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                {/* Search Bar for Group & Guru */}
                {activeTab !== 'MANUAL' && (
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="relative flex-1">
                      <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder={
                          activeTab === 'GROUP'
                            ? 'Cari nama grup WhatsApp...'
                            : 'Cari nama guru atau nomor HP...'
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    {activeTab === 'GROUP' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchTargets(true)}
                        disabled={isLoadingTargets}
                        className="h-8 px-2 text-[11px] shrink-0 cursor-pointer"
                        title="Segarkan daftar grup dari WhatsApp"
                      >
                        <RefreshCw size={12} className={isLoadingTargets ? 'animate-spin' : ''} />
                      </Button>
                    )}
                  </div>
                )}

                {/* Tab: Grup WhatsApp */}
                {activeTab === 'GROUP' && (
                  <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {isLoadingTargets ? (
                      <div className="p-6 text-center text-slate-400 flex flex-col items-center gap-2">
                        <Loader2 size={18} className="animate-spin text-indigo-600" />
                        <span>Memuat daftar grup WhatsApp dari server...</span>
                      </div>
                    ) : filteredGroups.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 space-y-1">
                        <AlertTriangle size={20} className="mx-auto text-amber-500" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          Tidak ada grup WhatsApp yang ditemukan
                        </p>
                        <p className="text-[11px]">
                          Pastikan nomor WA Gateway sekolah telah terhubung dan bergabung ke dalam grup sekolah.
                        </p>
                      </div>
                    ) : (
                      filteredGroups.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => handleSelectGroup(g)}
                          className="w-full p-2.5 text-left hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                              {g.subject}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {g.participantsCount ? `${g.participantsCount} Anggota` : 'Grup WhatsApp'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                            Pilih
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Tab: Guru / Pegawai */}
                {activeTab === 'GURU' && (
                  <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {isLoadingDirectory ? (
                      <div className="p-6 text-center text-slate-400 flex flex-col items-center gap-2">
                        <Loader2 size={18} className="animate-spin text-indigo-600" />
                        <span>Mencari kontak guru...</span>
                      </div>
                    ) : directoryItems.length === 0 ? (
                      <div className="p-6 text-center text-slate-400">
                        Tidak ada guru yang cocok dengan kata kunci.
                      </div>
                    ) : (
                      directoryItems.map((guru) => (
                        <button
                          key={guru.id}
                          type="button"
                          onClick={() => handleSelectGuru(guru)}
                          className="w-full p-2.5 text-left hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                              {guru.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {guru.phone || 'Nomor HP belum terdaftar'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                            Pilih
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Tab: Manual Phone */}
                {activeTab === 'MANUAL' && (
                  <div className="p-3.5 space-y-2">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Masukkan nomor WhatsApp tujuan (format diawali 08... atau 628...):
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Contoh: 081234567890"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleApplyManualPhone}
                        className="px-3 font-bold cursor-pointer"
                      >
                        Gunakan
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Message Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Isi Pesan WhatsApp:
              </label>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span>{message.length} karakter</span>
                <span>•</span>
                <span>{message.split('\n').length} baris</span>
              </div>
            </div>
            <textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tulis pesan WhatsApp yang ingin dikirim..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all resize-y"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyMessage}
              className="h-8 px-2.5 text-xs font-bold cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copied ? 'Tersalin!' : 'Salin Pesan'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenViaWhatsApp}
              className="h-8 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Kirim secara manual melalui aplikasi atau WhatsApp Web Anda"
            >
              <ExternalLink size={13} />
              <span>Buka WA Web/App</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSending}
              className="h-8 text-xs cursor-pointer"
            >
              Tutup
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSendViaGateway}
              disabled={isSending || !selectedTarget || !message.trim()}
              className="h-8 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Mengirim via Gateway...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Kirim via WA Gateway</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default UniversalSendWaModal;
