import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Camera, QrCode, X, ShieldCheck, User, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useDebounce } from '../../hooks/useDebounce';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import toast from 'react-hot-toast';
import type { IzinKeluarSiswa } from '../../api/piket.api';

interface SmartPermitPickerProps {
  permitList: IzinKeluarSiswa[];
  onSelect: (permit: IzinKeluarSiswa) => void;
  onEnter?: (code: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const SmartPermitPicker = React.forwardRef<HTMLInputElement, SmartPermitPickerProps>(({
  permitList,
  onSelect,
  onEnter,
  placeholder = "Scan QR Slip, RFID Kartu, atau cari nama...",
  className = "",
  autoFocus = false
}, ref) => {
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState<IzinKeluarSiswa[]>([]);
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
  };

  // Logic: Selection
  const handleSelect = useCallback((permit: IzinKeluarSiswa) => {
    setInputValue('');
    setResults([]);
    setShowDropdown(false);
    onSelect(permit);
  }, [onSelect]);

  // Logic: Local Search
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const term = debouncedSearch.toLowerCase();
    const filtered = permitList.filter(p => {
      const name = (p.SiswaAkademik?.siswa.nama_siswa || '').toLowerCase();
      const nis = (p.SiswaAkademik?.siswa.nis || '').toLowerCase();
      const rfid = (p.SiswaAkademik?.siswa.no_rfid || '').toLowerCase();
      const id = (p.id || '').toLowerCase();
      
      return name.includes(term) || nis.includes(term) || rfid.includes(term) || id.includes(term);
    });

    setResults(filtered);
    setShowDropdown(true);
  }, [debouncedSearch, permitList]);

  // Logic: HID (Scanner Fisik) Detection
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // If we have a single result in dropdown, select it
      if (results.length === 1) {
        handleSelect(results[0]);
        return;
      }

      // Otherwise, trigger onEnter for direct verification
      if (inputValue.trim()) {
        if (onEnter) onEnter(inputValue.trim());
        setInputValue('');
        setShowDropdown(false);
      }
    }
  };

  // Logic: Camera Scanner
  const startScanner = async () => {
    setIsScannerOpen(true);
    setScannerStatus('scanning');
    
    // Small delay to ensure video element is mounted
    setTimeout(async () => {
      try {
        const reader = new BrowserMultiFormatReader();
        zxingReaderRef.current = reader;
        
        const controls = await reader.decodeFromVideoDevice(
          undefined, 
          videoRef.current!, 
          (result, error) => {
            if (result) {
              const code = result.getText();
              console.log("[SmartPermitPicker] QR Scanned:", code);
              
              // Direct lookup in list
              const match = permitList.find(p => 
                p.id === code || 
                p.SiswaAkademik?.siswa.nis === code || 
                p.SiswaAkademik?.siswa.no_rfid === code
              );

              if (match) {
                setScannerStatus('success');
                setTimeout(() => {
                  stopScanner();
                  handleSelect(match);
                }, 500);
              } else {
                // If not in local list, maybe it's a valid code but not in today's cache?
                // For now, follow security gate logic: if not in list, trigger onEnter
                setScannerStatus('success');
                setTimeout(() => {
                  stopScanner();
                  if (onEnter) onEnter(code);
                }, 500);
              }
            }
          }
        );
        scannerControlsRef.current = controls;
      } catch (err) {
        console.error("[SmartPermitPicker] Camera Error:", err);
        setScannerStatus('error');
        toast.error("Gagal mengakses kamera");
      }
    }, 300);
  };

  const stopScanner = () => {
    if (scannerControlsRef.current) {
      scannerControlsRef.current.stop();
      scannerControlsRef.current = null;
    }
    zxingReaderRef.current = null;
    setIsScannerOpen(false);
    setScannerStatus('idle');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
          <ShieldCheck size={20} />
        </div>
        
        <Input
          ref={combinedRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-12 pr-24 h-14 rounded-xl border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-gray-700 dark:text-gray-200"
          autoFocus={autoFocus}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={startScanner}
            className="h-10 w-10 p-0 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
          >
            <Camera size={18} />
          </Button>
          <div className="w-px h-6 bg-gray-100 dark:bg-slate-800 mx-1" />
          <Search size={18} className="text-slate-300 mr-3" />
        </div>
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {showDropdown && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-[100] w-full mt-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl shadow-indigo-500/10 overflow-hidden"
          >
            <div className="p-2">
              {results.map((permit) => (
                <button
                  key={permit.id}
                  onClick={() => handleSelect(permit)}
                  className="w-full flex items-center gap-4 p-3 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 rounded-xl transition-colors text-left border-b border-gray-50 dark:border-slate-800/50 last:border-0"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                    <User size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900 dark:text-white text-sm uppercase truncate">
                        {permit.SiswaAkademik?.siswa.nama_siswa}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold">
                        {permit.SiswaAkademik?.kelas?.nama_kelas || 'UMUM'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      NIS: {permit.SiswaAkademik?.siswa.nis} • ID: {permit.id.substring(0, 8)}...
                    </p>
                    <p className="text-[10px] text-amber-600 font-bold italic mt-0.5 truncate">
                      "{permit.alasan}"
                    </p>
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
        onClose={stopScanner}
        title="Scan QR Slip Izin"
        size="md"
      >
        <div className="space-y-6 py-4">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border-4 border-slate-900 shadow-2xl">
            <video ref={videoRef} className="w-full h-full object-cover" />
            
            {/* Scanner Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-64 h-64 border-2 border-indigo-500/50 rounded-xl relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />
                
                {/* Scanning Animation */}
                {scannerStatus === 'scanning' && (
                  <motion.div 
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] z-10"
                  />
                )}
              </div>
            </div>

            {/* Status Overlays */}
            <AnimatePresence>
              {scannerStatus === 'success' && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[2px] flex items-center justify-center"
                >
                  <div className="bg-white rounded-full p-4 shadow-xl">
                    <Check className="text-emerald-500" size={48} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
              {scannerStatus === 'scanning' ? 'Mencari QR Code pada slip...' : 'Berhasil Terdeteksi!'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Posisikan QR Code di tengah kotak pemindai
            </p>
          </div>

          <Button 
            onClick={stopScanner} 
            variant="outline" 
            className="w-full h-12 rounded-xl font-bold"
          >
            Batal
          </Button>
        </div>
      </Modal>
    </div>
  );
});
