import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Phone } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getTeacherStatusMeta } from '@/utils/kbm-normalizer';
import toast from 'react-hot-toast';
import { GuruProduktifItem } from './types';

interface KaprogGuruDetailModalProps {
  guru: GuruProduktifItem | null;
  onClose: () => void;
  onNavigateToSesi: () => void;
}

export const KaprogGuruDetailModal: React.FC<KaprogGuruDetailModalProps> = React.memo(({
  guru,
  onClose,
  onNavigateToSesi,
}) => {
  if (!guru) return null;
  const statusMeta = getTeacherStatusMeta(guru.status);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        >
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {guru.nama}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                NIP: {guru.nip || '-'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">Status Kehadiran KBM</span>
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border', statusMeta.badgeClass)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', statusMeta.dotClass)} />
                <span>{statusMeta.titleCaseLabel}</span>
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Mata Pelajaran:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{guru.mapel}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Jadwal Hari Ini:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{guru.jamHariIni}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Ruang / Lab Praktik:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{guru.ruang || 'Lab Kejuruan'}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              {guru.noHp ? (
                <a
                  href={`https://wa.me/${guru.noHp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Hubungi WhatsApp</span>
                </a>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.error('Nomor WhatsApp guru ini belum terdaftar di Dapodik')}
                  className="flex-1 text-xs gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Kontak Belum Ada</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateToSesi}
                className="text-xs"
              >
                Buka Sesi KBM
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

KaprogGuruDetailModal.displayName = 'KaprogGuruDetailModal';
