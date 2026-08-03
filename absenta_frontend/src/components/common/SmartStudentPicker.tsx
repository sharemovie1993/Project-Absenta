import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Camera, QrCode, X, Check, Loader2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { siswaApi, guruApi, academicSearchApi } from '../../api/academic.api';
import { useDebounce } from '../../hooks/useDebounce';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import toast from 'react-hot-toast';

export interface Student {
  id: string;
  nama_siswa?: string;
  nama_guru?: string;
  full_name?: string;
  nisn?: string | null;
  nis?: string | null;
  nip?: string | null;
  no_rfid?: string | null;
  Kelas?: {
    nama_kelas: string;
  };
  foto_profile_url?: string;
  status?: string;
  user_id?: string | null;
}

interface SmartStudentPickerProps {
  id?: string;
  onSelect?: (student: Student) => void;
  onSelectStudent?: (student: Student) => void;
  placeholder?: string;
  scope?: 'teaching' | 'global' | 'piket';
  mode?: 'siswa' | 'guru' | 'universal';
  filterJurusan?: string;
  personaMode?: 'UTAMA' | 'JURUSAN';
  className?: string;
  allowCamera?: boolean;
  allowHID?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  value?: string;
  onChange?: (val: string) => void;
  onEnter?: (val: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}

function matchesJurusan(s: any, filterJurusan: string): boolean {
  if (!filterJurusan) return true;
  const fj = filterJurusan.toUpperCase().trim();
  if (!fj) return true;

  const targets: string[] = [
    s.Kelas?.Jurusan?.nama_jurusan,
    s.Kelas?.Jurusan?.singkatan,
    s.Kelas?.Jurusan?.kode,
    s.Kelas?.nama_kelas,
    s.kelas?.jurusan?.nama_jurusan,
    s.kelas?.jurusan?.singkatan,
    s.kelas?.jurusan?.kode,
    s.kelas?.nama_kelas,
    s.Jurusan?.nama_jurusan,
    s.Jurusan?.singkatan,
    s.Jurusan?.kode,
    s.jurusan?.nama_jurusan,
    s.jurusan?.singkatan,
    s.jurusan?.kode,
    s.nama_jurusan,
    s.kode_jurusan,
    s.singkatan_jurusan,
    s.nama_kelas,
    s.kelas_nama,
  ]
    .filter(Boolean)
    .map((val) => String(val).toUpperCase());

  if (targets.length === 0) return false;

  return targets.some((target) => target.includes(fj) || fj.includes(target));
}

export const SmartStudentPicker = React.forwardRef<HTMLInputElement, SmartStudentPickerProps>(({
  id,
  onSelect,
  onSelectStudent,
  placeholder,
  scope = 'global',
  mode = 'siswa',
  filterJurusan,
  personaMode,
  className = "",
  allowCamera = true,
  allowHID = true,
  autoFocus = false,
  disabled = false,
  value,
  onChange,
  onEnter,
  inputRef: externalInputRef
}, ref) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [results, setResults] = useState<Student[]>([]);
  
  // Sync with external value
  useEffect(() => {
    if (value !== undefined) setInputValue(value);
  }, [value]);

  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  
  const debouncedSearch = useDebounce(inputValue, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);
  const hidTimerRef = useRef<number | null>(null);

  // Combine external ref and internal ref
  const combinedRef = (node: HTMLInputElement) => {
    (inputRef as any).current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as any).current = node;
    }
    if (typeof externalInputRef === 'function') {
      externalInputRef(node);
    } else if (externalInputRef) {
      (externalInputRef as any).current = node;
    }
  };

  // 0. Logic: Selection (Define first to avoid initialization error)
  const handleSelect = useCallback((student: Student) => {
    setInputValue('');
    setResults([]);
    setShowDropdown(false);
    const callback = onSelect || onSelectStudent;
    if (typeof callback === 'function') {
      callback(student);
    }
  }, [onSelect, onSelectStudent]);

  // 1. Logic: Search API
  const performSearch = useCallback(async (term: string, isHID = false) => {
    if (term.length < 2 && !isHID) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    console.log(`[SmartStudentPicker] Searching for: "${term}" (HID: ${isHID}, Scope: ${scope}, Mode: ${mode}, Jurusan: ${filterJurusan || 'ALL'})`);
    setIsLoading(true);
    try {
      let list: Student[] = [];

      if (mode === 'universal') {
        const res = await academicSearchApi.universalSearch(term, 15);
        const results = res.data || [];
        
        // Map backend format to local Student interface
        list = results.map((item: any) => ({
          ...item.original_data,
          _type: item.type,
          // Ensure display names are consistent if not in original_data
          nama_siswa: item.type === 'siswa' ? item.name : undefined,
          nama_guru: item.type === 'guru' ? item.name : undefined,
        }));

        if (filterJurusan) {
          list = list.filter((s: any) => matchesJurusan(s, filterJurusan));
        }
      } else if (mode === 'guru') {
        const res = await guruApi.getAll({
          search: term,
          limit: 10,
          search_fields: ['nip', 'nama_guru', 'id']
        } as any);
        list = res.data || [];
      } else {
        const queryParams: Record<string, unknown> = {
          search: term,
          limit: 15,
          search_fields: ['nisn', 'nis', 'no_rfid', 'nama_siswa', 'id'],
          elevated_context: 'true',
          context: 'elevated',
        };

        if (filterJurusan) {
          queryParams.jurusan = filterJurusan;
          queryParams.nama_jurusan = filterJurusan;
          queryParams.jurusan_id = filterJurusan;
        }

        const res = await siswaApi.getAll(queryParams as any);
        list = (res.data || []).filter((s: Student) => s.status?.toUpperCase() === 'AKTIF' || !s.status);

        // Strict Jurusan Filtering & Scoping
        if (filterJurusan) {
          list = list.filter((s: any) => matchesJurusan(s, filterJurusan));
        }
      }

      console.log(`[SmartStudentPicker] Found ${list.length} items (Strictly Filtered by Jurusan: ${filterJurusan || 'ALL'})`);
      setResults(list);

      // HID Logic: If it's a fast input (HID) and we found an exact unique match, auto-select it
      if (isHID && list.length === 1) {
        const item = list[0];
        // Only auto-select if it matches exactly ID, NISN, RFID, NIS, or NIP
        const isExact = item.id === term ||
                        item.nisn === term ||
                        item.no_rfid === term ||
                        item.nis === term ||
                        item.nip === term;

        if (isExact) {
          console.log(`[SmartStudentPicker] HID Exact Match! Auto-selecting: ${item.nama_siswa || item.nama_guru}`);
          handleSelect(item);
          return;
        }
      }

      setShowDropdown(list.length > 0);
    } catch (err) {
      console.error('[SmartStudentPicker] Student search failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [scope, handleSelect]);

  // 2. Logic: HID Detection (Fast typing)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (onChange) onChange(val);

    if (allowHID) {
      if (hidTimerRef.current) window.clearTimeout(hidTimerRef.current);
      // If input is fast (RFID scanners usually type very fast), trigger search quickly
      const t = window.setTimeout(() => {
        if (val.length >= 6) { // Most IDs/RFID are 6+ chars
          console.log(`[SmartStudentPicker] HID potential detected: ${val}`);
          performSearch(val, true);
        }
      }, 150); // Slightly longer delay for HID to distinguish from manual typing
      hidTimerRef.current = t;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (inputValue.length >= 4) {
        console.log(`[SmartStudentPicker] Enter pressed, forcing search: ${inputValue}`);
        performSearch(inputValue, true);
      }
      if (onEnter) onEnter(inputValue);
    }
  };

  // 3. Logic: Regular Fuzzy Search (Debounced)
  useEffect(() => {
    if (debouncedSearch) {
      // Avoid searching again if HID already triggered or if it's too short
      if (debouncedSearch.length >= 2) {
        performSearch(debouncedSearch);
      }
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, [debouncedSearch, performSearch]);

  // 4. Logic: Camera Scanner
  const startScanner = async () => {
    console.log('[SmartStudentPicker] Starting QR Scanner...');
    setScannerStatus('scanning');
    try {
      zxingReaderRef.current = new BrowserMultiFormatReader();
      const videoEl = videoRef.current;
      if (!videoEl) return;

      const controls = await zxingReaderRef.current.decodeFromVideoDevice(undefined, videoEl, async (result) => {
        if (result) {
          const token = result.getText().trim();
          console.log(`[SmartStudentPicker] QR Scanned: ${token}`);
          if (token) {
            setScannerStatus('success');
            performSearch(token, true); // Treat QR as HID (instant match)
            setIsScannerOpen(false);
          }
        }
      });
      scannerControlsRef.current = controls;
    } catch (err) {
      console.error('[SmartStudentPicker] Failed to start QR scanner', err);
      setScannerStatus('error');
      toast.error('Gagal mengakses kamera');
    }
  };

  const stopScanner = () => {
    if (scannerControlsRef.current) {
      scannerControlsRef.current.stop();
      scannerControlsRef.current = null;
    }
    zxingReaderRef.current = null;
    setScannerStatus('idle');
  };

  useEffect(() => {
    if (isScannerOpen) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [isScannerOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {filterJurusan && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            🎯 Scope Smart Search: Jurusan {filterJurusan}
          </span>
          <span className="text-[10px] text-slate-400 font-medium italic">
            Prioritas {filterJurusan}
          </span>
        </div>
      )}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          )}
        </div>
        
        <Input
          id={id}
          ref={combinedRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Scan RFID / QR / Cari..."}
          autoFocus={autoFocus}
          disabled={disabled}
          autoComplete="off"
          className="pl-9 sm:pl-11 pr-9 sm:pr-20 h-11 sm:h-12 text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm group-hover:border-slate-300 dark:group-hover:border-slate-700 text-ellipsis overflow-hidden"
          onFocus={() => results.length > 0 && setShowDropdown(true)}
        />

        <div className="absolute inset-y-0 right-0 pr-1 flex items-center gap-1">
          {inputValue && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => {
                setInputValue('');
                setResults([]);
                setShowDropdown(false);
                inputRef.current?.focus();
              }}
              className="h-10 w-10 p-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-all"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {allowCamera && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => setIsScannerOpen(true)}
              className="h-10 w-10 p-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-all"
              title="Scan QR Siswa"
            >
              <Camera className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[100] mt-2 w-full bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden max-h-[320px] overflow-y-auto"
          >
            <div className="p-2 space-y-1">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl transition-colors text-left border-b border-gray-50 dark:border-slate-800/50 last:border-0 group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 overflow-hidden">
                    {item.foto_profile_url ? (
                      <img src={item.foto_profile_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900 dark:text-white text-sm uppercase truncate group-hover:text-indigo-600 transition-colors">
                        {((item as any)._type === 'guru' || mode === 'guru') ? item.nama_guru : item.nama_siswa}
                      </p>
                      {((item as any)._type === 'guru' || mode === 'guru') ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-black">
                          GURU
                        </span>
                      ) : (
                        item.Kelas && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold">
                            {item.Kelas.nama_kelas}
                          </span>
                        )
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {((item as any)._type === 'guru' || mode === 'guru') ? (item.nip ? `NIP: ${item.nip}` : 'GURU') : `NIS: ${item.nis || 'N/A'}`}
                      {item.no_rfid && ` • RFID: ${item.no_rfid}`}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Check className="h-4 w-4 text-indigo-500" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Modal */}
      <Modal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        title="Scan QR Kartu Siswa"
        size="md"
      >
        <div className="p-6 space-y-6">
          <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-inner">
            <video ref={videoRef} className="w-full h-full object-cover" />
            
            {/* Overlay Scanner UI */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white/30 rounded-xl relative">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />
                
                {/* Scanning Line */}
                {scannerStatus === 'scanning' && (
                  <motion.div
                    animate={{ top: ['10%', '90%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  />
                )}
              </div>
            </div>

            {scannerStatus === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest">
              <QrCode size={12} />
              Ready to Scan
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Posisikan QR Code kartu siswa tepat di dalam kotak pemindai.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setIsScannerOpen(false)}
              className="rounded-xl px-8"
            >
              Batal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});
