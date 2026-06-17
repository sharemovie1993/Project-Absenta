import React from 'react';
import { Settings } from 'lucide-react';
import { Modal, Button, Loader } from '../ui';

const formatDate = (date?: string | Date | null) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

export interface SubscriptionService {
  id: string;
  auto_renew?: boolean;
  end_date?: string | Date | null;
}

interface AutoRenewModalProps {
  isAutoRenewModalOpen: boolean;
  setIsAutoRenewModalOpen: (open: boolean) => void;
  selectedService: SubscriptionService | null;
  isUpdatingAutoRenew: boolean;
  handleToggleAutoRenew: () => Promise<void>;
}

export const AutoRenewModal: React.FC<AutoRenewModalProps> = ({
  isAutoRenewModalOpen,
  setIsAutoRenewModalOpen,
  selectedService,
  isUpdatingAutoRenew,
  handleToggleAutoRenew,
}) => {
  if (!selectedService) return null;

  return (
    <Modal
      isOpen={isAutoRenewModalOpen}
      onClose={() => setIsAutoRenewModalOpen(false)}
      title={selectedService?.auto_renew ? 'Matikan Perpanjangan Otomatis?' : 'Aktifkan Perpanjangan Otomatis?'}
      size="md"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedService.auto_renew ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'}`}>
            <Settings size={24} />
          </div>
          <div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${selectedService.auto_renew ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${selectedService.auto_renew ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
              Status: {selectedService.auto_renew ? 'Aktif (Otomatis)' : 'Manual'}
            </div>
          </div>
        </div>

        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
          {selectedService.auto_renew 
            ? `Jika dinonaktifkan, tagihan untuk periode berikutnya tidak akan dibuat secara otomatis. Anda harus melakukan pembayaran manual sebelum ${formatDate(selectedService.end_date)} agar layanan tidak terhenti.` 
            : 'Dengan mengaktifkan fitur ini, sistem akan secara otomatis menerbitkan invoice baru 3 hari sebelum masa aktif berakhir untuk memastikan layanan Anda tetap berjalan tanpa gangguan.'}
        </p>

        <div className="flex gap-3 pt-2">
          <Button 
            variant="outline" 
            className="flex-1 h-10 font-bold rounded-xl text-xs"
            onClick={() => setIsAutoRenewModalOpen(false)}
            disabled={isUpdatingAutoRenew}
          >
            Batal
          </Button>
          <Button 
            className={`flex-1 h-10 font-bold rounded-xl text-xs text-white ${selectedService.auto_renew ? 'bg-amber-600 hover:bg-amber-700 shadow-sm' : 'bg-emerald-600 hover:bg-emerald-700 shadow-sm'}`}
            onClick={handleToggleAutoRenew}
            disabled={isUpdatingAutoRenew}
          >
            {isUpdatingAutoRenew ? <Loader size="sm" className="mr-2" /> : null}
            {selectedService.auto_renew ? 'Nonaktifkan' : 'Aktifkan Sekarang'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
