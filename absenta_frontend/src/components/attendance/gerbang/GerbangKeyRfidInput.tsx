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

  // Always ensure input is focused on mount, window focus, or outside click
  useEffect(() => {
    const focusInput = () => {
      const el = inputRef.current || (document.getElementById('hid-input-field') as HTMLInputElement | null);
      if (el) {
        el.focus({ preventScroll: true });
      }
    };

    // Staged focus triggers to overcome Suspense & Framer Motion transitions
    focusInput();
    requestAnimationFrame(focusInput);
    const t1 = setTimeout(focusInput, 50);
    const t2 = setTimeout(focusInput, 150);
    const t3 = setTimeout(focusInput, 400);

    const onWindowFocus = () => focusInput();
    const onDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && !['BUTTON', 'A', 'SELECT', 'TEXTAREA'].includes(target.tagName) && !target.closest('button') && !target.closest('a')) {
        focusInput();
      }
    };

    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('click', onDocumentClick);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('click', onDocumentClick);
    };
  }, []);

  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-3.5 md:pl-4 flex items-center pointer-events-none text-slate-400">
        {isBypassMode ? (
          <ShieldAlert size={20} className="text-amber-500" />
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
        className={`w-full pl-11 md:pl-12 pr-4 py-3.5 md:py-4 text-base md:text-lg font-mono rounded-xl border-2 focus:ring-4 transition-all outline-none ${
          isBypassMode
            ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500/20 bg-amber-50/30'
            : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900'
        }`}
        placeholder="Scan Kartu RFID / QR..."
      />
    </div>
  );
};

GerbangKeyRfidInputComponent.displayName = 'GerbangKeyRfidInput';
export const GerbangKeyRfidInput = React.memo(GerbangKeyRfidInputComponent);
