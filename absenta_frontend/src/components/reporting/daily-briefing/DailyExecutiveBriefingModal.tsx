/**
 * DailyExecutiveBriefingModal.tsx
 * Modal pratinjau dan pengujian manual pengiriman pesan WhatsApp Laporan Harian ke Kepala Sekolah.
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Send,
  RefreshCw,
  ExternalLink,
  Phone,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  X,
  Users,
  BookmarkCheck,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button, Input, Alert, AlertTitle, AlertDescription } from '@/components/ui';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/lib/utils';
import {
  getDailyBriefingPreview,
  triggerDailyBriefingSend,
  getWhatsappGroupsForBriefing,
  getDailyBriefingGroupTarget,
  saveDailyBriefingGroupTarget,
  type UniversalBriefingData,
  type WaGroupOption,
  type BriefingGroupTarget,
} from '@/api/dailyBriefing.api';
import { DailyBriefingView } from './DailyBriefingView';
import { toast } from 'sonner';

export interface DailyExecutiveBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyExecutiveBriefingModal: React.FC<DailyExecutiveBriefingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [testPhone, setTestPhone] = useState('');
  const [selectedGroupJid, setSelectedGroupJid] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [lastSentUrl, setLastSentUrl] = useState<string | null>(null);

  const { data: waGroups = [] } = useQuery<WaGroupOption[]>({
    queryKey: ['wa-groups-for-briefing'],
    queryFn: getWhatsappGroupsForBriefing,
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const { data: savedGroupTarget, refetch: refetchGroupTarget } = useQuery<BriefingGroupTarget | null>({
    queryKey: ['daily-briefing-group-target'],
    queryFn: getDailyBriefingGroupTarget,
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  React.useEffect(() => {
    if (savedGroupTarget?.groupJid && !selectedGroupJid) {
      setSelectedGroupJid(savedGroupTarget.groupJid);
    }
  }, [savedGroupTarget, selectedGroupJid]);

  const {
    data: previewData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<UniversalBriefingData>({
    queryKey: ['daily-briefing-preview', 'KEPALA_SEKOLAH'],
    queryFn: () => getDailyBriefingPreview('KEPALA_SEKOLAH'),
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  const handleSendWa = async () => {
    try {
      setIsSending(true);
      const targetOverride = testPhone.trim() || selectedGroupJid.trim() || undefined;
      const res = await triggerDailyBriefingSend({
        role: 'KEPALA_SEKOLAH',
        targetPhoneOverride: targetOverride,
      });

      if (res.success) {
        toast.success(res.message);
        if (res.tokenUrl) {
          setLastSentUrl(res.tokenUrl);
        }
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengirim pesan WhatsApp');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDefaultGroup = async () => {
    try {
      setIsSavingGroup(true);
      const matched = waGroups.find((g) => g.id === selectedGroupJid);
      const res = await saveDailyBriefingGroupTarget(
        selectedGroupJid || null,
        matched?.subject
      );
      toast.success(res.message);
      refetchGroupTarget();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan grup WA default');
    } finally {
      setIsSavingGroup(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      className="w-[95vw] max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl"
    >
      {/* Modal Top Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Laporan Eksekutif Harian Kepala Sekolah
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                Pukul 19:00 WIB
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Pratinjau data agregasi seluruh divisi &amp; uji coba pengiriman pesan WhatsApp bertoken aman.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Control Action Bar */}
      <div className="p-3 sm:p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/40 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-[210px] sm:max-w-xs">
              <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedGroupJid}
                onChange={(e) => setSelectedGroupJid(e.target.value)}
                aria-label="Pilih Grup WhatsApp Tujuan"
                className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Target Default (Kepsek / Grup Tersimpan) --</option>
                {waGroups.map((grp) => (
                  <option key={grp.id} value={grp.id}>
                    Grup: {grp.subject} {grp.participantsCount ? `(${grp.participantsCount})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDefaultGroup}
              disabled={isSavingGroup}
              className="h-9 px-3 text-xs font-semibold rounded-xl shrink-0"
              title="Simpan grup terpilih sebagai tujuan otomatis pukul 19:00 WIB"
            >
              <BookmarkCheck className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              {selectedGroupJid ? 'Set Grup Default' : 'Reset Default'}
            </Button>
            <div className="relative w-full sm:w-48">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Atau No. WA Manual"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="h-9 pl-9 text-xs rounded-xl bg-white dark:bg-slate-900"
              />
            </div>
            <Button
              size="sm"
              onClick={handleSendWa}
              disabled={isSending}
              className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs shrink-0"
            >
              {isSending ? (
                <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 mr-1.5" />
              )}
              {selectedGroupJid && !testPhone.trim() ? 'Kirim ke Grup WA' : 'Kirim ke WhatsApp'}
            </Button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {lastSentUrl && (
              <a
                href={lastSentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-xs font-bold text-indigo-600 hover:underline px-2 py-1"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Buka Link Terkirim
              </a>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-9 text-xs text-slate-500 rounded-xl"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isRefetching && 'animate-spin')} />
              Segarkan Data
            </Button>
          </div>
        </div>
        {savedGroupTarget && (
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            Grup WA otomatis aktif (19:00 WIB): <b>{savedGroupTarget.groupName}</b>
          </p>
        )}
      </div>

      {/* Modal Body Preview */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-64 gap-2">
            <Loader size="lg" />
            <p className="text-xs text-slate-500">Mengagregasi data seluruh divisi...</p>
          </div>
        ) : previewData ? (
          <DailyBriefingView initialData={previewData} isModal={true} hideLayout={true} onClose={onClose} />
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            Tidak dapat memuat data pratinjau briefing.
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DailyExecutiveBriefingModal;
