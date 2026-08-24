import React from 'react';
import { X, RefreshCw, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface ProfileCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  capturedImage: string | null;
  cameraFacing: 'user' | 'environment';
  toggleCameraFacing: () => void;
  capturePhoto: () => void;
  setCapturedImage: (img: string | null) => void;
  startCamera: (facing: 'user' | 'environment') => void;
  uploadCapturedPhoto: () => void;
  uploadingFoto: boolean;
}

export const ProfileCameraModal: React.FC<ProfileCameraModalProps> = React.memo(({
  isOpen,
  onClose,
  videoRef,
  capturedImage,
  cameraFacing,
  toggleCameraFacing,
  capturePhoto,
  setCapturedImage,
  startCamera,
  uploadCapturedPhoto,
  uploadingFoto
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative flex flex-col items-center">
        
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">
            📷 Kamera Instan Absenta
          </h3>
          <button 
            type="button"
            aria-label="Tutup modal kamera"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Video Feed or Captured Preview */}
        <div className="w-full aspect-square bg-black rounded-2xl overflow-hidden relative shadow-inner border border-slate-800 flex items-center justify-center">
          {!capturedImage ? (
            <>
              <video 
                ref={videoRef as React.RefObject<HTMLVideoElement>} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {/* Square center cropping guide */}
              <div className="absolute inset-0 border-[30px] border-black/40 pointer-events-none flex items-center justify-center">
                <div className="w-full h-full border-2 border-dashed border-indigo-500/80 rounded-xl" />
              </div>
            </>
          ) : (
            <img 
              src={capturedImage} 
              alt="Captured Preview" 
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Actions Footer */}
        <div className="w-full flex flex-col gap-3 mt-6">
          {!capturedImage ? (
            <div className="flex gap-2 w-full justify-between items-center">
              <Button
                onClick={toggleCameraFacing}
                variant="outline"
                className="flex-1 h-11 text-xs font-bold rounded-2xl border-slate-800 hover:bg-slate-800 text-slate-300"
              >
                <RefreshCw size={13} className="mr-1.5" />
                Kamera {cameraFacing === 'user' ? 'Belakang' : 'Depan'}
              </Button>
              
              <button
                type="button"
                aria-label="Ambil foto"
                onClick={capturePhoto}
                className="w-14 h-14 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 border-4 border-white/20"
              >
                <div className="w-6 h-6 bg-white rounded-full" />
              </button>

              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 h-11 text-xs font-bold rounded-2xl border-slate-800 hover:bg-slate-800 text-slate-300"
              >
                Batal
              </Button>
            </div>
          ) : (
            <div className="flex gap-3 w-full">
              <Button
                onClick={() => {
                  setCapturedImage(null);
                  startCamera(cameraFacing);
                }}
                disabled={uploadingFoto}
                variant="outline"
                className="flex-1 h-11 text-xs font-black rounded-2xl border-slate-800 hover:bg-slate-800 text-slate-300"
              >
                Ulangi Foto
              </Button>
              <Button
                onClick={uploadCapturedPhoto}
                disabled={uploadingFoto}
                className="flex-1 h-11 text-xs font-black rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
              >
                {uploadingFoto ? (
                  <Loader2 size={13} className="animate-spin mr-1.5" />
                ) : (
                  <Camera size={13} className="mr-1.5" />
                )}
                Simpan & Upload
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
});
