import React from 'react';
import { Users } from 'lucide-react';
import { Modal, Badge, Label } from '../../ui';
import { ModuleSopTrigger } from '../../common/ModuleSopTrigger';
import { SmartStudentPicker, type Student } from '../../common/SmartStudentPicker';
import { SesiAttendanceList, type SesiAttendanceRecord, type SesiDetail } from './SesiAttendanceList';

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
  const modalTitle = (
    <div className="flex items-center gap-3">
      <span className="text-base font-semibold text-gray-900 dark:text-white">Input Presensi</span>
      <ModuleSopTrigger moduleKey="kbm_absensi" buttonLabel="SOP" />
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
        <div className="flex flex-col gap-1">
          <Label htmlFor="session-scanner-input" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Scan / Ketik Siswa atau Guru
          </Label>
          <div className="bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
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
          </div>
        </div>


        {/* Daftar Hadir */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={13} className="text-indigo-500" />
              Daftar Hadir Sesi
            </h4>
            <Badge variant="outline" className="text-[9px] font-black uppercase">
              {kelasLabel}
            </Badge>
          </div>

          <div className="max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            <SesiAttendanceList records={sessionAttendanceRecords} sesi={currentSession} />
          </div>
        </div>
      </div>
    </Modal>
  );
};

SesiScanningModalComponent.displayName = 'SesiScanningModal';
export const SesiScanningModal = React.memo(SesiScanningModalComponent);
