import React, { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPresensiTerpaduSesi } from '../../../api/attendanceGerbang.api';
import { Modal } from '../../ui';
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
}) => {
  // Reaktif dengan React Query — Kabel Tunggal Presensi Terpadu Detail
  const { data: presensiRes } = useQuery({
    queryKey: ['sesi-detail-attendance', inputModalSesiId],
    queryFn: () => getPresensiTerpaduSesi(inputModalSesiId),
    enabled: isOpen && !!inputModalSesiId,
    refetchInterval: 5000, // 5 detik auto refresh selama modal scan terbuka
  });

  const records: SesiAttendanceRecord[] = useMemo(() => {
    const raw = presensiRes?.data || presensiRes;
    const fetchedList = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
    return fetchedList.length > 0 ? fetchedList : (sessionAttendanceRecords || []);
  }, [presensiRes, sessionAttendanceRecords]);

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

  const sessionLabel = currentSession?.mapel_nama || (currentSession as any)?.jenis_kegiatan_nama || (currentSession as any)?.jenis_kegiatan || 'Sesi';
  const kelasInfo = (currentSession as any)?.kelas_nama || (currentSession as any)?.Kelas?.nama_kelas || '';

  const modalTitle = (
    <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
      <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white shrink-0">
        Tap/Scan • <span className="text-blue-600 dark:text-blue-400">{sessionLabel}</span> {kelasInfo ? `(${kelasInfo})` : ''}
      </span>
      <ModuleSopTrigger moduleKey="kbm_absensi" buttonLabel="SOP" />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="6xl"
      className="max-h-[96vh] w-[96vw] max-w-6xl mx-auto"
      contentClassName="max-h-[90vh] p-4 sm:p-6"
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
          <div className="max-h-[60vh] sm:max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
            <SesiAttendanceList 
              records={records} 
              sesi={currentSession}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

SesiScanningModalComponent.displayName = 'SesiScanningModal';
export const SesiScanningModal = React.memo(SesiScanningModalComponent);
