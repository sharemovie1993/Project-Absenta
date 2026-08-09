import React, { useState, useEffect } from 'react';
import { getMyJobdesk, type JobdeskData } from '../../api/jobdesk.api';
import { 
  Briefcase, 
  Shield, 
  CheckCircle2, 
  Sparkles,
  BookmarkCheck,
  ChevronRight,
  Info,
  EyeOff
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface MyJobdeskWidgetProps {
  alwaysVisible?: boolean;
}

export const MyJobdeskWidget: React.FC<MyJobdeskWidgetProps> = React.memo(({ alwaysVisible = false }) => {
  const [data, setData] = useState<JobdeskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'role' | 'position'>('role');
  const [selectedPositionIdx, setSelectedPositionIdx] = useState<number>(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [isHidden, setIsHidden] = useState(() => {
    if (alwaysVisible) return false;
    return localStorage.getItem('jobdesk_widget_hidden') !== 'false';
  });

  useEffect(() => {
    let active = true;
    const fetchJobdesk = async () => {
      try {
        setLoading(true);
        const res = await getMyJobdesk();
        if (active && res.success && res.data) {
          setData(res.data);
          // Set default active tab based on available data
          if (!res.data.roleJobdesk && res.data.positionJobdesks.length > 0) {
            setActiveTab('position');
          }
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Gagal memuat jobdesk Anda');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchJobdesk();
    
    // Check if previously acknowledged today
    const ackDate = localStorage.getItem('jobdesk_acknowledged_date');
    const today = new Date().toDateString();
    if (ackDate === today) {
      setAcknowledged(true);
    }

    return () => {
      active = false;
    };
  }, []);

  const handleAcknowledge = () => {
    setAnimating(true);
    setTimeout(() => {
      setAcknowledged(true);
      setAnimating(false);
      localStorage.setItem('jobdesk_acknowledged_date', new Date().toDateString());
    }, 800);
  };

  if (loading) {
    return (
      <div className="w-full bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700/50 shadow-sm animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-gray-200 dark:bg-slate-700 rounded-md"></div>
          <div className="h-6 w-20 bg-gray-200 dark:bg-slate-700 rounded-md"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-150 dark:bg-slate-700/80 rounded"></div>
          <div className="h-4 w-5/6 bg-gray-150 dark:bg-slate-700/80 rounded"></div>
          <div className="h-32 w-full bg-gray-100 dark:bg-slate-700/50 rounded-lg mt-4"></div>
        </div>
      </div>
    );
  }

  if (isHidden && !alwaysVisible) {
    return (
      <div className="w-full flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700/50 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Briefcase size={16} />
          </div>
          <div>
            <h4 className="text-xs font-black text-gray-800 dark:text-gray-200">📋 Peta Tugas Harian (Disembunyikan)</h4>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Tugas & Tanggung Jawab Resmi Anda</p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsHidden(false);
            localStorage.setItem('jobdesk_widget_hidden', 'false');
          }}
          className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 text-indigo-650 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200"
        >
          Tampilkan
        </button>
      </div>
    );
  }

  if (error || (!data?.roleJobdesk && (!data?.positionJobdesks || data.positionJobdesks.length === 0))) {
    // If no jobdesk is seeded yet, show a clean elegant fallback info instead of ugly screen
    return (
      <div className="w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-800/80 rounded-xl p-6 border border-slate-100 dark:border-slate-700/30 shadow-sm flex items-start gap-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
          <Info size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Panduan Tugas & Jobdesk</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Sistem belum mendeteksi deskripsi tugas spesifik untuk peran atau jabatan Anda saat ini. Hubungi administrator sekolah untuk mengonfigurasi jobdesk Anda di Panel Kontrol.
          </p>
        </div>
      </div>
    );
  }

  const hasRole = !!data.roleJobdesk;
  const hasPositions = data.positionJobdesks.length > 0;
  const activePosition = hasPositions ? data.positionJobdesks[selectedPositionIdx] : null;

  const currentJobdesk = activeTab === 'role' && data.roleJobdesk 
    ? data.roleJobdesk 
    : activePosition;

  return (
    <div className="w-full bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/50 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-gray-200/80 dark:hover:border-slate-650">
      
      {/* Top Header & Tab Switching */}
      <div className="p-5 border-b border-gray-50 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-gray-50/50 to-white dark:from-slate-800/30 dark:to-slate-800">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl text-white shadow-sm shadow-indigo-200 dark:shadow-none">
              <Briefcase size={18} className="animate-wiggle" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-1.5 leading-tight">
                📋 Peta Tugas Harian
                <Sparkles size={13} className="text-yellow-500 fill-yellow-500 animate-pulse" />
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                Rincian Tanggung Jawab Resmi Anda
              </p>
            </div>
          </div>

          {!alwaysVisible && (
            <button 
              onClick={() => {
                setIsHidden(true);
                localStorage.setItem('jobdesk_widget_hidden', 'true');
              }}
              className="sm:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              title="Sembunyikan Peta Tugas"
            >
              <EyeOff size={16} />
            </button>
          )}
        </div>

        {/* Right Header Operations */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          {hasRole && hasPositions && (
            <div className="bg-gray-100 dark:bg-slate-900/60 p-1 rounded-xl flex items-center">
              <button
                onClick={() => setActiveTab('role')}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 whitespace-nowrap flex items-center gap-1.5",
                  activeTab === 'role'
                    ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                )}
              >
                <Shield size={12} />
                Peran Utama
              </button>
              <button
                onClick={() => setActiveTab('position')}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 whitespace-nowrap flex items-center gap-1.5",
                  activeTab === 'position'
                    ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                )}
              >
                <Briefcase size={12} />
                Jabatan Tambahan
              </button>
            </div>
          )}

          {!alwaysVisible && (
            <button 
              onClick={() => {
                setIsHidden(true);
                localStorage.setItem('jobdesk_widget_hidden', 'true');
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all border border-transparent hover:border-gray-100 dark:hover:border-slate-700/50 rounded-xl"
              title="Sembunyikan Peta Tugas"
            >
              <EyeOff size={13} />
              <span>Sembunyikan</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6">
        {/* If viewing positions, and there are multiple positions, show switcher badges */}
        {activeTab === 'position' && data.positionJobdesks.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {data.positionJobdesks.map((pos, idx) => (
              <button
                key={pos.position_id}
                onClick={() => setSelectedPositionIdx(idx)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border",
                  selectedPositionIdx === idx
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400"
                    : "bg-white border-gray-150 text-gray-500 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                )}
              >
                {pos.position_name}
              </button>
            ))}
          </div>
        )}

        {/* Current Active Item Card */}
        {currentJobdesk && (
          <div className="space-y-5">
            {/* Description Box */}
            <div className="relative bg-gradient-to-br from-indigo-50/30 to-purple-50/20 dark:from-slate-900/30 dark:to-slate-900/10 rounded-xl p-5 border border-indigo-50/50 dark:border-slate-800/40">
              <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 text-[8px] font-black text-indigo-700 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-300 rounded-md border border-indigo-100/50 dark:border-indigo-900/30 uppercase tracking-widest">
                {activeTab === 'role' ? 'Role Baseline' : 'Struktural Duty'}
              </span>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-1">
                {activeTab === 'role' && data.roleJobdesk ? data.roleJobdesk.role_name : activePosition?.position_name}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed font-medium">
                {currentJobdesk.description || 'Deskripsi operasional belum terkonfigurasi secara detail.'}
              </p>
            </div>

            {/* Task Checklist Items */}
            <div>
              <h5 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                📌 Daftar Tugas Konkret
              </h5>
              <div className="space-y-3">
                {currentJobdesk.tasks && currentJobdesk.tasks.length > 0 ? (
                  currentJobdesk.tasks.map((task: string, idx: number) => (
                    <div 
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50/50 dark:hover:bg-slate-900/20 transition-all duration-150 border border-transparent hover:border-gray-100 dark:hover:border-slate-800/30 group"
                    >
                      <div className="mt-0.5 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-250">
                        <CheckCircle2 size={15} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-slate-350 leading-relaxed">
                        {task}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 dark:text-slate-500 italic py-2">
                    Belum ada butir tugas konkret yang didefinisikan.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Bottom Footer */}
      <div className="px-6 py-4 bg-gray-50/50 dark:bg-slate-900/20 border-t border-gray-50 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookmarkCheck size={14} className="text-emerald-500" />
          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 leading-tight">
            Absenta.id melacak kesadaran tugas untuk optimalisasi performa kerja.
          </span>
        </div>

        <button
          onClick={handleAcknowledge}
          disabled={acknowledged || animating}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-350 self-start sm:self-center shadow-sm flex items-center gap-1.5",
            acknowledged
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border dark:border-emerald-900/30 shadow-none cursor-default"
              : animating
                ? "bg-indigo-400 text-white animate-pulse"
                : "bg-indigo-650 hover:bg-indigo-700 text-white hover:shadow-md active:scale-95"
          )}
        >
          {acknowledged ? (
            <>
              Tugas Dipahami ✓
            </>
          ) : (
            <>
              Saya Paham Tugas Saya
              <ChevronRight size={13} />
            </>
          )}
        </button>
      </div>
    </div>
  );
});
