import React, { useState, useEffect } from 'react';
import { LayoutList, PlayCircle } from 'lucide-react';
import { Modal } from '../../ui';
import { ModuleSopTrigger } from '../../common/ModuleSopTrigger';
import { SmartStudentPicker, type Student } from '../../common/SmartStudentPicker';
import { SesiAttendanceList, type SesiAttendanceRecord, type SesiDetail } from './SesiAttendanceList';
import { cn } from '../../../lib/utils';

interface SesiScanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannerInputRef: React.RefObject<HTMLInputElement>;
  scannerInput: string;
  setScannerInput: (val: string) => void;
  scanLoading: boolean;
  onSubmitScan: (overrideId?: string, isGuruFromUniversal?: boolean) => void;
  inputModalSesiId: string;
  sessionAttendanceRecords: SesiAttendanceRecord[];
  currentSession?: SesiDetail;
  kelasLabel: string;
}

const SesiScanningModalComponent: React.FC<SesiScanningModalProps> = ({
  isOpen,
  onClose,
  scannerInputRef,
  scannerInput,
  setScannerInput,
  scanLoading,
  onSubmitScan,
  inputModalSesiId,
  sessionAttendanceRecords,
  currentSession,
  kelasLabel,
}) => {
  const [isSlideMode, setIsSlideMode] = useState(false);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (scannerInputRef.current) {
          scannerInputRef.current.focus();
          scannerInputRef.current.select();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, scannerInputRef]);

  const modalTitle = (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white shrink-0">Tap/Scan</span>
      <ModuleSopTrigger moduleKey="kbm_absensi" buttonLabel="SOP" />
      <button
        onClick={() => setIsSlideMode(prev => !prev)}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all border shrink-0",
          isSlideMode
            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
        )}
        title={isSlideMode ? "Kembali ke Mode List" : "Buka Mode Slideshow"}
      >
        {isSlideMode ? <LayoutList size={13} /> : <PlayCircle size={13} />}
        <span className="text-[11px] font-bold">{isSlideMode ? "List" : "Slideshow"}</span>
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="2xl"
      className="max-h-[96vh]"
      contentClassName="max-h-[88vh]"
    >
      <div className="space-y-4">
        {/* Search / Scan Input */}
        <SmartStudentPicker
          id="session-scanner-input"
          ref={scannerInputRef}
          value={scannerInput}
          onChange={setScannerInput}
          placeholder="Scan kartu, ketik Nama, NIS, NIP, atau RFID..."
          disabled={scanLoading}
          mode="universal"
          onSelect={(item: Student) =>
            onSubmitScan(item.id, (item as unknown as { _type?: string })._type === 'guru')
          }
          scope="global"
        />


        {/* Daftar Hadir */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            <SesiAttendanceList 
              records={sessionAttendanceRecords} 
              sesi={currentSession}
              isSlideMode={isSlideMode}
              onToggleSlideMode={() => setIsSlideMode(prev => !prev)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

SesiScanningModalComponent.displayName = 'SesiScanningModal';
export const SesiScanningModal = React.memo(SesiScanningModalComponent);
