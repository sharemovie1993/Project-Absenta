import React from 'react';
import { Button } from '../../ui';

interface GerbangQrInputProps {
  scannerStatus: string;
  onSwitchCamera: () => void;
}

const GerbangQrInputComponent: React.FC<GerbangQrInputProps> = ({
  scannerStatus,
  onSwitchCamera,
}) => {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative overflow-hidden rounded-2xl bg-slate-950 w-full max-w-xl min-h-[350px] shadow-2xl ring-1 ring-slate-800 flex items-center justify-center">
        {/* Production-grade html5-qrcode scanner container with High-Contrast Sharpening Filter */}
        <div id="qr-reader" className="w-full h-full min-h-[350px] overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:rounded-2xl [&_video]:contrast-[1.25] [&_video]:brightness-[1.05] [&_video]:saturate-[1.1]" />
        <div className="absolute bottom-3 left-0 w-full text-center text-white text-xs font-semibold drop-shadow-md bg-black/60 py-1.5 backdrop-blur-sm pointer-events-none z-10 px-4">
          {scannerStatus || 'Arahkan QR Code Kartu Pelajar / Pegawai ke dalam kamera'}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onSwitchCamera} className="text-xs font-semibold">
          📷 Ganti / Switch Kamera
        </Button>
      </div>
    </div>
  );
};

GerbangQrInputComponent.displayName = 'GerbangQrInput';
export const GerbangQrInput = React.memo(GerbangQrInputComponent);
