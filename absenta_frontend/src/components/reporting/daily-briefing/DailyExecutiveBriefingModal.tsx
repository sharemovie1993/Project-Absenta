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
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button, Input, Alert, AlertTitle, AlertDescription } from '@/components/ui';
import { Loader } from '@/components/ui/Loader';
import {
  getDailyBriefingPreview,
  triggerDailyBriefingSend,
  type UniversalBriefingData,
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
  const [isSending, setIsSending] = useState(false);
  const [lastSentUrl, setLastSentUrl] = useState<string | null>(null);

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
      const res = await triggerDailyBriefingSend({
        role: 'KEPALA_SEKOLAH',
        targetPhoneOverride: testPhone.trim() || undefined,
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
      <div className="p-3 sm:p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="No. WA Tes (opsional)"
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
            Kirim ke WhatsApp
          </Button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
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
