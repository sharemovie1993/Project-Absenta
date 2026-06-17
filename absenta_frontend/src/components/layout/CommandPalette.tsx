import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ArrowRight, 
  Terminal, 
  FileText, 
  Users, 
  Settings,
  Zap,
  Command
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavStore } from '../../store/navStore';

interface CommandItem {
  id: string;
  label: string;
  path: string;
  icon: any;
  category: string;
}

const commands: CommandItem[] = [
  // Akademik
  { id: 'siswa', label: 'Data Siswa', path: '/academic/siswa', icon: Users, category: 'Akademik' },
  { id: 'guru', label: 'Data Guru', path: '/academic/guru', icon: Users, category: 'Akademik' },
  { id: 'kelas', label: 'Manajemen Kelas', path: '/academic/kelas', icon: FileText, category: 'Akademik' },
  { id: 'jadwal', label: 'Jadwal Pelajaran', path: '/kurikulum/jadwal', icon: Zap, category: 'Akademik' },
  
  // Operasional
  { id: 'attendance-ops', label: 'Operasional Absensi', path: '/attendance/ops', icon: Zap, category: 'Operasional' },
  { id: 'monitoring-kbm', label: 'Monitoring KBM', path: '/attendance/monitoring', icon: Settings, category: 'Operasional' },
  { id: 'rekap', label: 'Rekap Kehadiran', path: '/attendance/rekap', icon: FileText, category: 'Operasional' },
  
  // Finansial
  { id: 'billing', label: 'Tagihan & Invoice', path: '/billing/billings', icon: Terminal, category: 'Finansial' },
  { id: 'payments', label: 'Riwayat Pembayaran', path: '/billing/payments', icon: Zap, category: 'Finansial' },
  { id: 'coop', label: 'Dashboard Koperasi', path: '/cooperative/dashboard', icon: Zap, category: 'Finansial' },
  
  // Sistem
  { id: 'settings', label: 'Pengaturan Sistem', path: '/settings', icon: Settings, category: 'Sistem' },
  { id: 'users', label: 'Manajemen User', path: '/users', icon: Users, category: 'Sistem' },
  { id: 'tenants', label: 'Manajemen Tenant', path: '/tenants', icon: Settings, category: 'Sistem' },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { detectHubFromPath } = useNavStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filtered = query.trim() === '' 
    ? commands.slice(0, 5) 
    : commands.filter(c => 
        c.label.toLowerCase().includes(query.toLowerCase()) || 
        c.category.toLowerCase().includes(query.toLowerCase())
      );

  const handleSelect = (path: string) => {
    navigate(path);
    detectHubFromPath(path);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      handleSelect(filtered[selectedIndex].path);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[60]"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-[70] px-4"
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="p-6 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                  <Command size={20} />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ketik perintah atau cari modul... (Siswa, Tagihan, Absensi)"
                  className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <div className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-[10px] font-black text-gray-400">
                  ESC
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-gray-500 font-medium">Tidak ada hasil ditemukan.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filtered.map((cmd, idx) => {
                      const isActive = idx === selectedIndex;
                      const Icon = cmd.icon;
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => handleSelect(cmd.path)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left group",
                            isActive 
                              ? "bg-indigo-50 dark:bg-indigo-900/20 shadow-sm" 
                              : "hover:bg-gray-50 dark:hover:bg-slate-800/50"
                          )}
                        >
                          <div className={cn(
                            "p-2 rounded-xl transition-all",
                            isActive ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-500"
                          )}>
                            <Icon size={18} />
                          </div>
                          <div className="flex-1">
                            <p className={cn(
                              "font-bold transition-colors",
                              isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-900 dark:text-gray-100"
                            )}>
                              {cmd.label}
                            </p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">
                              {cmd.category}
                            </p>
                          </div>
                          {isActive && (
                            <motion.div layoutId="arrow" initial={{ x: -10 }} animate={{ x: 0 }}>
                              <ArrowRight size={18} className="text-indigo-400" />
                            </motion.div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50/50 dark:bg-slate-950/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-[10px] font-bold">↑↓</kbd>
                    <span className="text-[10px] text-gray-500">Navigasi</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-[10px] font-bold">ENTER</kbd>
                    <span className="text-[10px] text-gray-500">Pilih</span>
                  </div>
                </div>
                <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                  <Zap size={10} className="fill-current" />
                  Absenta QuickJump
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
