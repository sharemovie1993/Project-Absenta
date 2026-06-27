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
}

interface HubinTimelineLogbookBuilderProps {
  parsedTimeline: LogbookTimelineItem[];
  handleDeleteActivity: (idx: number) => void;
  onOpenAddModal: () => void;
  todayAbsensi: TodayAbsensi | null;
}

export const HubinTimelineLogbookBuilder: React.FC<HubinTimelineLogbookBuilderProps> = ({
  parsedTimeline,
  handleDeleteActivity,
  onOpenAddModal,
  todayAbsensi
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header with Title & Summary - Compact */}
      <div className="p-5 border-b border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/30 dark:bg-slate-900/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100/50 dark:shadow-none">
            <BookOpen size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Timeline Jurnal Kegiatan</h3>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
              <History size={10} /> {parsedTimeline.length} Entri Hari Ini
            </p>
          </div>
        </div>

        <Button 
          onClick={onOpenAddModal}
          variant="primary"
          size="sm"
          className="rounded-xl px-4 h-9 font-black text-[9px] uppercase tracking-widest flex items-center gap-2 group"
        >
          <Plus size={14} />
          Catat Baru
        </Button>
      </div>

      {/* Timeline List - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        {parsedTimeline.length === 0 ? (
          <div className="text-center py-12 px-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-600 italic text-xs">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-300 dark:text-slate-700">
              <BookOpen size={24} />
            </div>
            <p className="font-black uppercase tracking-widest text-[9px] mb-1">Jurnal Kosong</p>
            <p className="text-[9px] opacity-70">Tekan "Catat Baru" untuk mengisi.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {parsedTimeline?.map((item: LogbookTimelineItem, idx: number) => (
              <div key={idx} className="flex gap-4 group">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-[10px] border border-indigo-100 dark:border-indigo-500/20 group-hover:scale-110 transition-transform">
                    {item.time}
                  </div>
                  {idx !== parsedTimeline.length - 1 && (
                    <div className="w-px h-full bg-slate-100 dark:bg-slate-800 mt-2" />
                  )}
                </div>
                <div className="flex-1 bg-slate-50/50 dark:bg-white/[0.02] p-4 rounded-xl border border-slate-50 dark:border-white/5 group-hover:bg-white dark:group-hover:bg-white/[0.04] transition-all">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                      {item.text}
                    </p>
                    <button 
                      onClick={() => handleDeleteActivity(idx)}
                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                      title="Hapus Jurnal"
                    >
                      <Trash2 size={14} />
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
                        className="mt-3 block w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group/img relative"
                      >
                        <img 
                          src={thumbUrl || resolvedUrl} 
                          alt="Dokumentasi" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <ExternalLink size={16} className="text-white" />
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
      <div className="p-3 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 flex justify-between items-center px-6">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">*Realtime Jurnal PKL</span>
        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">Sync <ArrowRight size={10} /></span>
      </div>
    </div>
  );
};
