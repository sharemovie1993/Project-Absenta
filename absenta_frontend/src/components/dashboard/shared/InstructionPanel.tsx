import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Lightbulb, BookOpen, ChevronRight, CheckCircle2 } from 'lucide-react';

export interface InstructionItem {
  text: string;
  icon?: React.ReactNode;
  path?: string;
  completed?: boolean;
}

interface InstructionPanelProps {
  title?: string;
  description?: string;
  items?: InstructionItem[];
  tips?: string[];
}

export const InstructionPanel: React.FC<InstructionPanelProps> = ({
  title = "Pusat Petunjuk",
  description,
  items = [],
  tips = [],
}) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.08)] p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl -mr-12 -mt-12" />
        
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{title}</h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Reference Guide</p>
          </div>
        </div>

        {description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed relative z-10">
            {description}
          </p>
        )}
      </div>

      {/* Main Instructions */}
      {items.length > 0 && (
        <div className="space-y-3">
          <h4 className="px-1 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
            Langkah Utama
          </h4>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div 
                key={idx} 
                className={`group bg-white/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 p-4 rounded-xl border border-slate-100/50 dark:border-slate-800/50 hover:border-blue-200 dark:hover:border-blue-900/30 transition-all ${item.path ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                onClick={() => item.path && navigate(item.path)}
              >
                <div className="flex gap-4">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border group-hover:scale-110 transition-transform ${
                    item.completed 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/40' 
                      : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30'
                  }`}>
                    {item.completed ? <CheckCircle2 size={12} /> : (idx + 1)}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs leading-normal pt-0.5 transition-colors ${
                       item.completed 
                        ? 'text-slate-400 dark:text-slate-500 line-through decoration-slate-300' 
                        : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
                    }`}>
                      {item.text}
                    </p>
                    {item.path && !item.completed && (
                      <span className="text-[9px] text-blue-500 font-bold uppercase tracking-tighter mt-1 block opacity-0 group-hover:opacity-100 transition-opacity">
                        Klik untuk Setup
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pro Tips / Quick Facts */}
      {tips.length > 0 && (
        <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100/50 dark:border-amber-900/20 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
             <Lightbulb className="w-12 h-12 text-amber-500" />
          </div>
          
          <h4 className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 mb-3">
            <span className="w-1.5 h-4 bg-amber-400 rounded-full" />
            Tahukah Anda?
          </h4>
          
          <ul className="space-y-3">
            {tips.map((tip, idx) => (
              <li key={idx} className="flex gap-2.5">
                <ChevronRight className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                  {tip}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer Info */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
        <p className="text-[10px] text-slate-500 dark:text-slate-500 italic">
          Gunakan panduan ini untuk memaksimalkan efisiensi kerja Anda di modul ini.
        </p>
      </div>
    </div>
  );
};
