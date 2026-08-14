import React from 'react';
import { Modal } from '../../../ui/Modal';
import { SesiAttendanceList } from '../../../attendance/sesi/SesiAttendanceList';
import { Button } from '../../../ui';
import { BookOpen } from 'lucide-react';

interface KbmDetailModalProps {
  selectedSesi: any;
  onClose: () => void;
  detailLoading: boolean;
  detailAttendance: any;
  journalModalOpen: boolean;
  setJournalModalOpen: (open: boolean) => void;
}

export const KbmDetailModal = React.memo<KbmDetailModalProps>(({
  selectedSesi,
  onClose,
  detailLoading,
  detailAttendance,
  journalModalOpen,
  setJournalModalOpen
}) => {
  return (
    <Modal
      isOpen={!!selectedSesi}
      onClose={onClose}
      title={
        <div className="flex flex-col">
          <span className="text-lg font-black">{selectedSesi?.Mapel?.nama_mapel || '-'}</span>
          <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">
            {selectedSesi?.Kelas?.nama_kelas || '-'} • {selectedSesi?.Guru?.nama_guru || '-'}
          </span>
        </div>
      }
      size="lg"
    >
      <div className="p-6">
        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {detailLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-400 text-sm">Memuat data hadir...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {(() => {
                const recordsArray = Array.isArray(detailAttendance?.data)
                  ? detailAttendance.data
                  : Array.isArray(detailAttendance)
                  ? detailAttendance
                  : [];
                return (
                  <SesiAttendanceList records={recordsArray} sesi={selectedSesi} isReportMode={true} />
                );
              })()}
              
              {selectedSesi?.ProgresMateri && (
                <div className="flex justify-center pt-4">
                  <Button 
                    variant="outline" 
                    className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 shadow-sm"
                    onClick={() => setJournalModalOpen(true)}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Buka Detail Jurnal
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <Button variant="primary" onClick={onClose} className="rounded-xl px-10 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-200 dark:shadow-none">
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
});

KbmDetailModal.displayName = 'KbmDetailModal';
