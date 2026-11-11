import React from 'react';
import { Modal } from '@/components/ui';
import {
  Wrench,
  CalendarClock,
  Printer,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export type DapodikToolKey = 'lppdUsia' | 'beritaAcaraRekon';

interface DapodikToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalDapodikStudents: number;
  hasComparisonData: boolean;
  onSelectTool: (toolKey: DapodikToolKey) => void;
}

export const DapodikToolsModal: React.FC<DapodikToolsModalProps> = ({
  isOpen,
  onClose,
  totalDapodikStudents,
  hasComparisonData,
  onSelectTool,
}) => {
  const tools = [
    {
      key: 'lppdUsia' as DapodikToolKey,
      title: 'Rekap Data Siswa Menurut Usia (Verval LPPD)',
      description:
        'Hitung sebaran 6 kelompok usia (<15, 15, 16, 17, 18, >18 Th) murni sumber Dapodik, salin tabel, & cetak Berita Acara + TTD Universal.',
      icon: CalendarClock,
      color:
        'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/20',
      badge: 'LPPD 2026',
      disabled: totalDapodikStudents === 0,
    },
    {
      key: 'beritaAcaraRekon' as DapodikToolKey,
      title: 'Berita Acara Rekonsiliasi Dapodik–Absenta',
      description:
        'Cetak laporan resmi & PDF True WYSIWYG hasil audit keselarasan dan selisih data peserta didik Dapodik vs Absenta.',
      icon: Printer,
      color:
        'text-indigo-600 bg-indigo-500/10 border-indigo-500/20 dark:text-indigo-400 dark:bg-indigo-500/20',
      badge: 'Dokumen Audit',
      disabled: !hasComparisonData,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tools & Utilitas Integrasi Dapodik"
      size="2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Pusat Utilitas &amp; Pelaporan Data Dapodik
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Pilih alat analisis, verval dinas, atau dokumen cetak resmi berbasis snapshot/web service Dapodik ({totalDapodikStudents.toLocaleString('id-ID')} siswa terbaca).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.key}
                type="button"
                disabled={tool.disabled}
                onClick={() => {
                  onClose();
                  onSelectTool(tool.key);
                }}
                className="group relative flex items-center justify-between p-4 bg-white dark:bg-slate-950 hover:bg-slate-50/80 dark:hover:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-800 rounded-2xl text-left transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${tool.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {tool.title}
                      </h4>
                      <span className="text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                        {tool.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {tool.description}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white flex items-center justify-center shrink-0 transition-all ml-3">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Sumber Murni Staging / Web Service Dapodik
          </span>
          <span className="italic">Absenta Dapodik Toolkit</span>
        </div>
      </div>
    </Modal>
  );
};

export default DapodikToolsModal;
