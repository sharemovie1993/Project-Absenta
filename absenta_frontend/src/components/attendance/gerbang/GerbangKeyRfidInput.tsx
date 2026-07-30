import React, { useEffect, useRef } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button, Label } from '../../ui';
import { type Student } from '../../common/SmartStudentPicker';

interface GerbangKeyRfidInputProps {
  hidToken: string;
  onHidTokenChange: (val: string) => void;
  autoSubmitGateHID: (val: string) => void;
  isBypassMode: boolean;
  showDropdown: boolean;
  setShowDropdown: (val: boolean) => void;
  searchCandidates: Student[];
  onSelectStudent: (token: string, student: Student) => void;
  onSubmit: (token: string) => void;
}

const GerbangKeyRfidInputComponent: React.FC<GerbangKeyRfidInputProps> = ({
  hidToken,
  onHidTokenChange,
  autoSubmitGateHID,
  isBypassMode,
  showDropdown,
  setShowDropdown,
  searchCandidates,
  onSelectStudent,
  onSubmit,
}) => {
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [preventSoftKeyboard, setPreventSoftKeyboard] = React.useState<boolean>(true);
  const bufferRef = useRef<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowDropdown]);

  // Global RFID Keydown Listener when soft keyboard is suppressed (Mode RFID Reader)
  useEffect(() => {
    if (!preventSoftKeyboard) return;

    const handleGlobalRfidKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && target.id !== 'hid-input-field') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        const scanned = bufferRef.current.trim() || hidToken.trim();
        if (scanned) {
          bufferRef.current = '';
          onHidTokenChange(scanned);
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
  }, [preventSoftKeyboard, hidToken, onHidTokenChange, onSubmit]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="hid-input-field" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {isBypassMode ? 'Input Token / ID Bypass' : 'Input Token / RFID / NIS'}
          </Label>

          <button
            type="button"
            onClick={() => setPreventSoftKeyboard(!preventSoftKeyboard)}
            className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
              preventSoftKeyboard 
                ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800' 
                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
            title="Klik untuk mengaktifkan/mematikan keyboard layar HP saat tap kartu RFID"
          >
            {preventSoftKeyboard ? '⚡ Mode RFID Reader (Keyboard HP Off)' : '⌨️ Ketik Manual (Keyboard ON)'}
          </button>
        </div>

        <div className="relative group" ref={searchContainerRef}>
          <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
            <span className="text-gray-400">
              {isBypassMode ? (
                <ShieldAlert size={20} className="text-amber-500" />
              ) : (
                <div className="i-lucide-scan-line w-5 h-5" />
              )}
            </span>
          </div>
          <input
            id="hid-input-field"
            readOnly={preventSoftKeyboard}
            inputMode={preventSoftKeyboard ? "none" : "text"}
            value={hidToken}
            onChange={(e) => {
              if (!preventSoftKeyboard) onHidTokenChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (!preventSoftKeyboard && e.key === 'Enter') {
                e.preventDefault();
                if (hidToken.trim()) {
                  onSubmit(hidToken.trim());
                }
              }
            }}
            className={`w-full pl-10 md:pl-11 pr-4 py-2.5 md:py-3.5 text-base md:text-lg font-mono rounded-xl border-2 focus:ring-4 transition-all outline-none ${
              isBypassMode
                ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500/20 bg-amber-50/30'
                : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 bg-gray-50 focus:bg-white'
            }`}
            placeholder={preventSoftKeyboard ? '⚡ Tempelkan Kartu RFID...' : 'Scan Kartu / NIS...'}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <span className="hidden md:inline text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 bg-white">
              Auto-Submit
            </span>
          </div>

          {/* Search Dropdown */}
          {showDropdown && searchCandidates.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden max-h-60 overflow-y-auto">
              {searchCandidates.map((student) => (
                <button
                  key={student.id}
                  onClick={() => {
                    const token = student.nisn || student.no_rfid || student.nis || student.id;
                    onHidTokenChange(token);
                    onSelectStudent(token, student);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center justify-between group/item"
                  type="button"
                >
                  <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                      {student.nama_siswa}
                    </div>
                    <div className="text-xs text-gray-500 flex gap-2 mt-0.5">
                      {student.nisn && (
                        <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 px-1.5 rounded font-mono">
                          NISN: {student.nisn}
                        </span>
                      )}
                      {student.nis && (
                        <span className="bg-gray-100 dark:bg-gray-700 px-1.5 rounded">
                          NIS: {student.nis}
                        </span>
                      )}
                      {student.no_rfid && (
                        <span className="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-1.5 rounded">
                          RFID
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    Pilih
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          variant={isBypassMode ? 'warning' : 'primary'}
          size="lg"
          onClick={() => onSubmit(hidToken)}
          disabled={!hidToken}
          className="w-full md:w-auto px-8"
        >
          {isBypassMode ? 'PROSES BYPASS' : 'KIRIM ABSENSI'}
        </Button>
      </div>
    </div>
  );
};

GerbangKeyRfidInputComponent.displayName = 'GerbangKeyRfidInput';
export const GerbangKeyRfidInput = React.memo(GerbangKeyRfidInputComponent);
