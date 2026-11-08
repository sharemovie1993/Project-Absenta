import React from 'react';
import { DenahSpasialView } from '../../spasial/DenahSpasialView';
import type { KelasRoomMapping } from './cbtOrchestratorHelper';

interface CbtDenahModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomMappings?: KelasRoomMapping[];
  eventName?: string;
  highlightRoomCode?: string | null;
  highlightLabel?: string;
  isReadOnly?: boolean;
}

export const CbtDenahModal: React.FC<CbtDenahModalProps> = ({
  isOpen,
  onClose,
  roomMappings = [],
  eventName,
  highlightRoomCode,
  highlightLabel,
  isReadOnly = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-1 sm:p-3 overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full h-full max-w-[98vw] max-h-[96vh] flex flex-col overflow-hidden">
        <DenahSpasialView
          isModal={true}
          readOnly={isReadOnly}
          onClose={onClose}
          eventName={eventName}
          roomMappings={roomMappings}
          highlightRoomCode={highlightRoomCode}
          highlightLabel={highlightLabel}
          tipe="EVENT_UJIAN"
        />
      </div>
    </div>
  );
};

export default CbtDenahModal;
