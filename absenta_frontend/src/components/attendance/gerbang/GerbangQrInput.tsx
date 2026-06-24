import React from 'react';
import { Button } from '../../ui';

interface GerbangQrInputProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  scannerStatus: string;
  onSwitchCamera: () => void;
}

const GerbangQrInputComponent: React.FC<GerbangQrInputProps> = ({
  videoRef,
  scannerStatus,
  onSwitchCamera,
}) => {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative overflow-hidden rounded-lg bg-black w-full aspect-video max-w-lg shadow-inner ring-1 ring-gray-900/10">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <div className="absolute inset-0 border-2 border-white/30 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
        </div>
        <div className="absolute bottom-4 left-0 w-full text-center text-white text-sm font-medium drop-shadow-md">
          {scannerStatus}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onSwitchCamera}>
          Switch Camera
        </Button>
      </div>
    </div>
  );
};

GerbangQrInputComponent.displayName = 'GerbangQrInput';
export const GerbangQrInput = React.memo(GerbangQrInputComponent);
