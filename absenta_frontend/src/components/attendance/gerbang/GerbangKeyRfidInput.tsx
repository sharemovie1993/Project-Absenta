import React, { useEffect, useRef } from 'react';
import { ShieldAlert, Zap } from 'lucide-react';
import { Label } from '../../ui';

interface GerbangKeyRfidInputProps {
  hidToken: string;
  onHidTokenChange: (val: string) => void;
  isBypassMode: boolean;
  onSubmit: (token: string) => void;
}

const GerbangKeyRfidInputComponent: React.FC<GerbangKeyRfidInputProps> = ({
  hidToken,
  onHidTokenChange,
  isBypassMode,
  onSubmit,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Global RFID & Barcode Keydown Listener for Express Hardware Ingestion
  useEffect(() => {
    const handleGlobalRfidKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && target.id !== 'hid-input-field') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        const scanned = bufferRef.current.trim() || hidToken.trim();
        if (scanned) {
          bufferRef.current = '';
          onHidTokenChange('');
          onSubmit(scanned);
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
        onHidTokenChange(bufferRef.current);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          bufferRef.current = '';
        }, 1500);
      }
    };

    window.addEventListener('keydown', handleGlobalRfidKey);
    return () => {
      window.removeEventListener('keydown', handleGlobalRfidKey);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hidToken, onHidTokenChange, onSubmit]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="hid-input-field" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>{isBypassMode ? 'Terminal Scan Bypass (Force HADIR)' : 'Terminal Scan Hardware (RFID / QR 2D)'}</span>
          </Label>
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300 dark:border-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-ping" />
            Scanner Siap
          </span>
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none text-slate-400">
            {isBypassMode ? (
              <ShieldAlert size={22} className="text-amber-500" />
            ) : (
              <div className="i-lucide-scan-line w-5 h-5 text-blue-600" />
            )}
          </div>
          <input
            ref={inputRef}
            id="hid-input-field"
            type="text"
            autoFocus
            value={hidToken}
            onChange={(e) => onHidTokenChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (hidToken.trim()) {
                  const val = hidToken.trim();
                  onHidTokenChange('');
                  onSubmit(val);
                }
              }
            }}
            className={`w-full pl-11 md:pl-12 pr-28 py-3.5 md:py-4 text-base md:text-lg font-mono rounded-xl border-2 focus:ring-4 transition-all outline-none ${
              isBypassMode
                ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500/20 bg-amber-50/30'
                : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900'
            }`}
            placeholder="⚡ Tempelkan Kartu RFID atau Arahkan QR Code ke Scanner..."
          />
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
            <span className="text-[11px] font-bold text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 shadow-2xs">
              Auto-Capture
            </span>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 font-medium">
        Jalur Cepat Hardware: Siswa (NISN) & Guru (NIP/NIK/RFID). Untuk siswa yang tidak membawa kartu, gunakan tab <b>Input Manual</b>.
      </p>
    </div>
  );
};

GerbangKeyRfidInputComponent.displayName = 'GerbangKeyRfidInput';
export const GerbangKeyRfidInput = React.memo(GerbangKeyRfidInputComponent);
