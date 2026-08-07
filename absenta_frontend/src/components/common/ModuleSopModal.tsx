import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, ShieldCheck, Info, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { useModuleSop } from '../../hooks/useModuleSop';
import { Badge } from '../ui/Badge';

interface ModuleSopModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleKey: string;
}

export const ModuleSopModal: React.FC<ModuleSopModalProps> = ({
  isOpen,
  onClose,
  moduleKey
}) => {
  const { sopConfig } = useModuleSop(moduleKey);
  const [activeTabId, setActiveTabId] = useState<string>('');

  // Set initial active tab
  React.useEffect(() => {
    if (sopConfig.tabs.length > 0 && !activeTabId) {
      setActiveTabId(sopConfig.tabs[0].id);
    }
  }, [sopConfig, activeTabId]);

  if (!isOpen) return null;

  const currentTab = sopConfig.tabs.find(t => t.id === activeTabId) || sopConfig.tabs[0];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 translate-x-6 -translate-y-6">
            <BookOpen size={180} />
          </div>

          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-indigo-300 shadow-inner">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">{sopConfig.moduleName}</h2>
                <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/30 font-black text-[9px] uppercase px-2 py-0.5">
                  {sopConfig.badgeText}
                </Badge>
              </div>
              <p className="text-xs text-indigo-200/80 font-medium mt-0.5">{sopConfig.description}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="relative z-10 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 px-6 pt-3 gap-2 overflow-x-auto">
          {sopConfig.tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`px-4 py-2.5 rounded-t-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 ${
                activeTabId === tab.id
                  ? 'border-indigo-600 text-indigo-600 bg-white dark:bg-slate-900 dark:text-indigo-400 shadow-sm'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-white dark:bg-slate-900">
          {currentTab?.sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-3">
              <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} /> {section.title}
              </h3>

              {section.type === 'rules_matrix' && section.matrixData && (
                <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 font-black text-[10px] uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Aturan / Jenis</th>
                        <th className="p-3">Batas Maksimal</th>
                        <th className="p-3">Dampak Sesi KBM</th>
                        <th className="p-3">Konsekuensi / Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-gray-300 font-medium">
                      {section.matrixData.map((item, mIdx) => (
                        <tr key={mIdx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-bold text-gray-900 dark:text-white">{item.rule}</td>
                          <td className="p-3 font-black text-indigo-600 dark:text-indigo-400">{item.limit}</td>
                          <td className="p-3 text-gray-600 dark:text-gray-400">{item.impact}</td>
                          <td className="p-3 text-rose-600 dark:text-rose-400 font-bold">{item.consequence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {section.type === 'bullet_list' && section.bullets && (
                <ul className="space-y-2">
                  {section.bullets.map((bText, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed bg-gray-50/50 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-100/50 dark:border-slate-800">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{bText}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/80 flex justify-between items-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            SOP Terintegrasi Absenta • Persona: {currentTab?.roleTag || 'Umum'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all"
          >
            Mengerti & Tutup
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
