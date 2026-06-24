import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getGuruList } from '@/api/academic/guru.api';
import { getSiswaList } from '@/api/academic/siswa.api';
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
  const [options, setOptions] = useState<{ label: string; value: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const isSearchingRef = useRef(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

      // Jika ada scroll di manapun, kita update posisinya atau tutup
      const handleScroll = (e: Event) => {
        // Jika scroll terjadi di dalam dropdown sendiri, abaikan
        if (containerRef.current?.contains(e.target as Node)) return;
        // Untuk kestabilan, kita tutup saja saat scroll agar tidak melayang liar
        onClose();
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

  const performSearch = useCallback(async (searchQuery: string) => {
    if (isSearchingRef.current) return;
    
    isSearchingRef.current = true;
    setSearching(true);
    
    try {
      const isSiswa = node.data?.roleCode === 'PETUGAS_KELAS';
      if (isSiswa) {
        const res = await getSiswaList(1, 50, searchQuery, node.data.kelas_id, 'AKTIF');
        setOptions((res.data || []).map(s => ({ 
            label: s.nama_siswa, 
            value: s.id
        })));
      } else {
        const res = await getGuruList(1, 50, searchQuery);
        setOptions((res.data || []).map(g => ({ 
            label: g.nama_guru, 
            value: g.id
        })));
      }
    } catch (error) {
      console.error(error);
    } finally {
      isSearchingRef.current = false;
      setSearching(false);
    }
  }, [node.data?.roleCode, node.data?.kelas_id]);

  useEffect(() => {
    performSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [performSearch]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => performSearch(val), 300);
  }, [performSearch]);

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

      <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-2" style={{ scrollbarWidth: 'thin' }}>
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
