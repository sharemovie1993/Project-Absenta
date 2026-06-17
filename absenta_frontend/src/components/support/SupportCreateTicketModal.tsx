import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, X, AlertCircle, RefreshCw, Send } from 'lucide-react';
import { SearchableSelect } from '@/components/ui';
import { type SupportTicketCategory, type SupportTicketPriority } from '../../api/support-ticket.api';

interface SupportCreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    category: SupportTicketCategory;
    priority: SupportTicketPriority;
  }) => Promise<void>;
  isCreating: boolean;
}

export const SupportCreateTicketModal: React.FC<SupportCreateTicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isCreating
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SupportTicketCategory>('TECHNICAL');
  const [priority, setPriority] = useState<SupportTicketPriority>('MEDIUM');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    await onSubmit({ title, description, category, priority });
    
    // Reset form on success (handled by parent calling onClose/render reset)
    setTitle('');
    setDescription('');
    setCategory('TECHNICAL');
    priority && setPriority('MEDIUM');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Dark Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 z-10 overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Ticket size={20} className="text-indigo-400" />
                <h3 className="text-sm font-extrabold">Ajukan Pengaduan / Tiket Bantuan</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors duration-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label htmlFor="modal_new_ticket_title" className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Judul Aduan</label>
                <input
                  id="modal_new_ticket_title"
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Contoh: Mesin gerbang gerbang 2 tidak membaca kartu RFID"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                  maxLength={100}
                  required
                />
              </div>

              {/* Grid Category & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="modal_new_ticket_category" className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Kategori Masalah</label>
                  <SearchableSelect
                    options={[
                      { label: 'Kendala Bug/Sistem', value: 'TECHNICAL' },
                      { label: 'Tagihan & Keuangan', value: 'BILLING' },
                      { label: 'Mesin Sensor RFID', value: 'DEVICE_HARDWARE' },
                      { label: 'Request Fitur Baru', value: 'FEATURE_REQUEST' },
                      { label: 'Lainnya', value: 'OTHER' }
                    ]}
                    value={category}
                    onValueChange={(val: string) => setCategory(val as SupportTicketCategory)}
                    placeholder="Pilih Kategori"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="modal_new_ticket_priority" className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tingkat Urgensi</label>
                  <SearchableSelect
                    options={[
                      { label: 'Low (Bisa ditunda)', value: 'LOW' },
                      { label: 'Medium (Kendala Minor)', value: 'MEDIUM' },
                      { label: 'High (Kendala Mengganggu)', value: 'HIGH' },
                      { label: 'URGENT (Operasional Macet)', value: 'URGENT' }
                    ]}
                    value={priority}
                    onValueChange={(val: string) => setPriority(val as SupportTicketPriority)}
                    placeholder="Pilih Urgensi"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label htmlFor="modal_new_ticket_desc" className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Deskripsi Lengkap Kronologi Masalah</label>
                <textarea
                  id="modal_new_ticket_desc"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Mohon tuliskan detail masalah Anda secara lengkap (misal: jam kejadian, kronologi error, langkah yang telah dicoba)..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200 min-h-[120px]"
                  required
                />
              </div>

              {/* Info SLA */}
              <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-start space-x-2 text-[10px] text-indigo-700 dark:text-indigo-400 font-bold leading-relaxed">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  INFO SLA: Permintaan aduan dengan prioritas URGENT/HIGH akan segera direspon oleh tim dukungan CS platform dalam waktu maksimal 1-2 jam kerja. Prioritas LOW/MEDIUM diselesaikan maksimal 24 jam kerja.
                </span>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black transition-colors duration-200"
                  disabled={isCreating}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black hover:shadow-lg hover:shadow-indigo-600/25 transition-all duration-200"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Mengirim aduan...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Kirim Tiket Aduan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
