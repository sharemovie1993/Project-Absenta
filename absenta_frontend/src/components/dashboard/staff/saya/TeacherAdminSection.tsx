import React from 'react';
import { FileText, CreditCard, FolderArchive, Shield, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeacherAdminSectionProps {
  onOpenAjukanIzin: () => void;
  onOpenIdCard: () => void;
  onOpenDocuments: () => void;
  onOpenSecurity: () => void;
  className?: string;
}

export const TeacherAdminSection: React.FC<TeacherAdminSectionProps> = React.memo(({
  onOpenAjukanIzin,
  onOpenIdCard,
  onOpenDocuments,
  onOpenSecurity,
  className,
}) => {
  return (
    <div className={cn("space-y-2 w-full", className)}>
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Administrasi &amp; Dokumen Pegawai
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full">
        {/* 1. Ajukan Cuti / Izin */}
        <button
          type="button"
          onClick={onOpenAjukanIzin}
          className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2.5 text-left group cursor-pointer hover:border-amber-500/40 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                Ajukan Cuti / Izin
              </h4>
              <p className="text-[10px] text-slate-400 truncate">
                Dinas, Sakit &amp; Cuti
              </p>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
        </button>

        {/* 2. Kartu Pegawai Digital */}
        <button
          type="button"
          onClick={onOpenIdCard}
          className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2.5 text-left group cursor-pointer hover:border-blue-500/40 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <CreditCard size={16} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                Kartu ID Digital
              </h4>
              <p className="text-[10px] text-slate-400 truncate">
                Barcode &amp; RFID
              </p>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
        </button>

        {/* 3. Berkas & Dokumen SK */}
        <button
          type="button"
          onClick={onOpenDocuments}
          className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2.5 text-left group cursor-pointer hover:border-indigo-500/40 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <FolderArchive size={16} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                Berkas &amp; SK
              </h4>
              <p className="text-[10px] text-slate-400 truncate">
                SK Pembagian Tugas
              </p>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
        </button>

        {/* 4. Keamanan Akun & PIN */}
        <button
          type="button"
          onClick={onOpenSecurity}
          className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2.5 text-left group cursor-pointer hover:border-emerald-500/40 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Shield size={16} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                Keamanan &amp; PIN
              </h4>
              <p className="text-[10px] text-slate-400 truncate">
                Password &amp; PIN
              </p>
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0" />
        </button>
      </div>
    </div>
  );
});

TeacherAdminSection.displayName = 'TeacherAdminSection';
