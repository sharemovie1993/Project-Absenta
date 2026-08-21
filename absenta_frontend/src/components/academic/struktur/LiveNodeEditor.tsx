import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useGuruOptions, useSiswaOptions } from '@/components/common';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TopologyNodeData } from './types';

interface LiveNodeEditorProps {
  node: TopologyNodeData | null | undefined;
  onSave: (val: { value: string; label: string }) => Promise<void>;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
}

export const LiveNodeEditor: React.FC<LiveNodeEditorProps> = React.memo(({ node, onSave, onClose, anchorEl }) => {
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isSiswa = node?.data?.roleCode === 'PETUGAS_KELAS';
  const PENDIDIK_ONLY_ROLES = ['WALIKELAS', 'KAPROG', 'KABENG', 'PEMBINA_ESKUL'];
  const jenisPtk = PENDIDIK_ONLY_ROLES.includes(node?.data?.roleCode || '') ? 'PENDIDIK' : 'ALL';

  const { options: guruOptions, isLoading: searchingGuru } = useGuruOptions({ jenisPtk });
  const { options: siswaOptions, isLoading: searchingSiswa } = useSiswaOptions({ 
    kelasId: isSiswa ? node?.data?.kelas_id : undefined, 
    onlyActive: true 
  });

  const rawOptions = isSiswa ? siswaOptions : guruOptions;
  const searching = isSiswa ? searchingSiswa : searchingGuru;

  const [displayLimit, setDisplayLimit] = useState(40);

  // Reset displayLimit whenever search query changes
  useEffect(() => {
    setDisplayLimit(40);
  }, [query]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return rawOptions;
    const q = query.toLowerCase();
    return rawOptions.filter(o => o.label.toLowerCase().includes(q));
  }, [rawOptions, query]);

  const options = useMemo(() => {
    return filteredOptions.slice(0, displayLimit);
  }, [filteredOptions, displayLimit]);

  const handleScrollList = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + clientHeight) < 40) {
      setDisplayLimit(prev => {
        if (prev >= filteredOptions.length) return prev;
        return prev + 40;
      });
    }
  }, [filteredOptions.length]);

  useEffect(() => {
    if (anchorEl) {
      const updatePosition = () => {
        const rect = anchorEl.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: Math.max(rect.width, 240)
        });
      };

      updatePosition();

      const handleScroll = (e: Event) => {
        if (containerRef.current?.contains(e.target as Node)) return;
        updatePosition();
      };

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [anchorEl, onClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node) && 
          anchorEl && !anchorEl.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorEl]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleSelect = useCallback(async (val: string, label: string) => {
    if (saving || !node) return; // Defensive check
    setSaving(true);
    try {
      await onSave({ value: val, label });
      // Let the parent handle closing
    } catch (err) {
      console.error('Gagal menyimpan:', err);
    } finally {
      setSaving(false);
    }
  }, [saving, node, onSave]);

  if (!node) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div 
          ref={containerRef}
          className="w-full max-h-[85vh] bg-white dark:bg-slate-900 rounded-t-3xl border-t border-amber-400 dark:border-amber-600 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300"
        >
          {/* Mobile Handle & Header */}
          <div className="flex flex-col items-center pt-3 pb-2 px-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mb-2" />
            <div className="flex items-center justify-between w-full">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block">
                  Penugasan Jabatan
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                  {node.label || 'Pilih Personil'}
                </h4>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative flex items-center px-4 h-12 border-b border-slate-100 dark:border-slate-800 bg-amber-50/40 dark:bg-slate-800/40">
            <Search size={16} className="text-amber-500 mr-3 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleSearchChange}
              placeholder="Ketik nama guru atau siswa..."
              className="bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 w-full"
              autoComplete="off"
            />
            {saving && <Loader2 size={16} className="animate-spin text-amber-500 ml-2" />}
          </div>

          {/* Options List */}
          <div onScroll={handleScrollList} className="overflow-y-auto custom-scrollbar p-3 flex-1 max-h-[60vh]">
            {searching ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 size={24} className="animate-spin text-amber-500/60" />
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Mencari Data...</span>
              </div>
            ) : options.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400">Data personil tidak ditemukan</p>
              </div>
            ) : (
              <div className="space-y-1.5 pb-6">
                {(options || []).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(opt.value, opt.label)}
                    className="flex items-center px-4 py-3 w-full text-left transition-all rounded-xl hover:bg-amber-500 hover:text-white dark:hover:bg-amber-600 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 active:scale-98"
                  >
                    <span className="text-xs font-bold truncate">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div 
      ref={containerRef}
      className="fixed z-[9999] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-amber-400/50 dark:border-amber-600/50 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 ring-4 ring-black/5"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${Math.max(position.width + 40, 320)}px` // Lebih lebar agar melimpah keluar
      }}
    >
      <div className="relative flex items-center px-5 h-12 border-b border-amber-100 dark:border-slate-800 bg-amber-50/50 dark:bg-slate-800/50">
        <Search size={14} className="text-amber-500 mr-4 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleSearchChange}
          placeholder="Cari nama personil..."
          className="bg-transparent border-none outline-none text-[13px] font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 w-full"
          autoComplete="off"
        />
        {saving && <Loader2 size={14} className="animate-spin text-amber-500 ml-2" />}
      </div>

      <div onScroll={handleScrollList} className="max-h-[350px] overflow-y-auto custom-scrollbar p-2" style={{ scrollbarWidth: 'thin' }}>
        {searching ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 size={24} className="animate-spin text-amber-500/40" />
            <span className="text-[10px] font-bold text-amber-600/40 uppercase tracking-widest">Mencari Data...</span>
          </div>
        ) : options.length === 0 ? (
          <div className="py-8 text-center bg-slate-50/50 dark:bg-slate-950/30 rounded-xl m-1 border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">Data tidak ditemukan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1">
            {(options || []).map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value, opt.label)}
                className="group flex items-center px-4 py-3 w-full text-left transition-all rounded-lg hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-600 dark:hover:from-amber-600 dark:hover:to-orange-700"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-white truncate">
                    {opt.label}
                  </span>
                </div>
              </button>
            ))}
            {filteredOptions.length > options.length && (
              <div className="py-2 text-center text-[9px] font-bold text-amber-600/60 uppercase tracking-wider animate-pulse">
                Scroll ke bawah untuk memuat ({filteredOptions.length - options.length} lagi)...
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sistem Penugasan v2.0</span>
         <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
         </div>
      </div>
    </div>,
    document.body
  );
});

LiveNodeEditor.displayName = 'LiveNodeEditor';
