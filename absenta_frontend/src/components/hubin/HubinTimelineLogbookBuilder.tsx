import React from 'react';
import { BookOpen, Trash2, Plus, ExternalLink, History, ArrowRight } from 'lucide-react';
import { Button } from '../ui';
import { getDriveThumbnailUrl, resolveAttachmentUrl } from '../../utils/hubinUtils';

interface LogbookTimelineItem {
  time: string;
  text: string;
  image_url?: string;
}

interface TodayAbsensi {
  jam_masuk?: string;
  jam_pulang?: string;
  status?: string;
}

interface HubinTimelineLogbookBuilderProps {
  parsedTimeline: LogbookTimelineItem[];
  handleDeleteActivity: (idx: number) => void;
  onOpenAddModal: () => void;
  todayAbsensi: TodayAbsensi | null;
}

export const HubinTimelineLogbookBuilder: React.FC<HubinTimelineLogbookBuilderProps> = React.memo(({
  parsedTimeline,
  handleDeleteActivity,
  onOpenAddModal,
  todayAbsensi
}) => {
  const isIzinOrSakit = todayAbsensi?.status === 'SAKIT' || todayAbsensi?.status === 'IZIN';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header with Title & Summary - Compact */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/40 dark:bg-slate-900/20">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="p-1.5 sm:p-2 bg-indigo-600 rounded-lg text-white shadow-xs">
            <BookOpen size={15} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Timeline Jurnal</h3>
            <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <History size={10} /> {parsedTimeline.length} Entri Hari Ini
            </p>
          </div>
        </div>

        <Button 
          onClick={onOpenAddModal}
          variant="primary"
          size="sm"
          disabled={isIzinOrSakit}
          className={`rounded-xl px-3 h-8 font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5 group shrink-0 shadow-xs ${
            isIzinOrSakit ? 'opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400' : 'cursor-pointer'
          }`}
          title={isIzinOrSakit ? 'Jurnal tidak aktif saat sedang izin atau sakit' : undefined}
        >
          <Plus size={13} />
          Catat Baru
        </Button>
      </div>

      {/* Timeline List - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 scrollbar-hide">
        {parsedTimeline.length === 0 ? (
          <div className="text-center py-10 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-600 italic text-xs">
            <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-2 text-slate-300 dark:text-slate-700">
              <BookOpen size={20} />
            </div>
            <p className="font-black uppercase tracking-widest text-[9px] mb-0.5">
              {isIzinOrSakit ? `Status Hari Ini: ${todayAbsensi?.status}` : 'Jurnal Masih Kosong'}
            </p>
            <p className="text-[8px] opacity-70">
              {isIzinOrSakit ? 'Anda sedang berstatus izin/sakit. Pengisian jurnal harian tidak diwajibkan.' : 'Tekan "Catat Baru" untuk mengisi pekerjaan hari ini.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {parsedTimeline?.map((item: LogbookTimelineItem, idx: number) => (
              <div key={idx} className="flex gap-2.5 sm:gap-3 group">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-[9px] border border-indigo-100 dark:border-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                    {item.time}
                  </div>
                  {idx !== parsedTimeline.length - 1 && (
                    <div className="w-px h-full bg-slate-100 dark:bg-slate-800 my-1" />
                  )}
                </div>
                <div className="flex-1 bg-slate-50/70 dark:bg-white/[0.02] p-3 sm:p-3.5 rounded-xl border border-slate-100 dark:border-white/5 group-hover:bg-white dark:group-hover:bg-white/[0.04] transition-all">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                      {item.text}
                    </p>
                    <button 
                      onClick={() => handleDeleteActivity(idx)}
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all shrink-0 cursor-pointer"
                      title="Hapus Jurnal"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {item.image_url && (() => {
                    const resolvedUrl = resolveAttachmentUrl(item.image_url);
                    const thumbUrl = getDriveThumbnailUrl(resolvedUrl);
                    return (
                      <a 
                        href={resolvedUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-2.5 block w-full h-28 sm:h-32 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 group/img relative"
                      >
                        <img 
                          src={thumbUrl || resolvedUrl} 
                          alt="Dokumentasi" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <ExternalLink size={15} className="text-white" />
                        </div>
                      </a>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/10 flex justify-between items-center px-4">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">*Realtime Jurnal PKL</span>
        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-wider flex items-center gap-1">Sync <ArrowRight size={10} /></span>
      </div>
    </div>
  );
});
