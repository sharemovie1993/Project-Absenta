import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, Image as ImageIcon, Check, UploadCloud } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui';
import { toast } from 'react-hot-toast';

interface HubinCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
}

export const HubinCameraModal: React.FC<HubinCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Ambil Foto Bukti'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('');

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraReady(false);
    }
  }, [stream]);

  const startCamera = useCallback(async (deviceId?: string) => {
    stopCamera();
    setIsCameraReady(false);
    
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId } } 
          : { facingMode: 'environment' }
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        // Wait for video to be ready to play
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
        };
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error starting camera:', error);
      
      // Extreme fallback if 'exact' deviceId failed
      if (deviceId) {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setStream(fallbackStream);
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            setIsCameraReady(true);
          }
        } catch (fErr) {
          toast.error('Gagal membuka kamera: ' + error.message);
        }
      } else {
        toast.error('Gagal membuka kamera.');
      }
    }
  }, [stopCamera]);

  const initInitialCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('Browser Anda tidak mendukung akses kamera.');
      return;
    }

    try {
      // First, try a generic request to trigger permission prompt
      const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Once permitted, we can get better device info
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const cameras = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(cameras);

      // Stop the initial generic stream
      initialStream.getTracks().forEach(track => track.stop());

      if (cameras.length > 0) {
        // Try to find back camera
        const backCamera = cameras.find(c => 
          c.label.toLowerCase().includes('back') || 
          c.label.toLowerCase().includes('rear') ||
          c.label.toLowerCase().includes('environment')
        );
        
        const selectedId = backCamera ? backCamera.deviceId : cameras[0].deviceId;
        setActiveDeviceId(selectedId);
        startCamera(selectedId);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Initial camera error:', error);
      // Fallback: just try to start with default
      startCamera();
    }
  }, [startCamera]);

  useEffect(() => {
    if (isOpen) {
      initInitialCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [isOpen, initInitialCamera, stopCamera]);

  const switchCamera = useCallback(() => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex(d => d.deviceId === activeDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDeviceId = devices[nextIndex].deviceId;
    setActiveDeviceId(nextDeviceId);
    startCamera(nextDeviceId);
  }, [devices, activeDeviceId, startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    // Set canvas dimensions to match video
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    
    // Draw current video frame to canvas
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Convert to data URL for preview
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
    setCapturedImage(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    onClose();
  }, [stopCamera, onClose]);

  const handleConfirm = useCallback(() => {
    if (!capturedImage) return;

    // Convert dataUrl to File object
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        handleClose();
      });
  }, [capturedImage, onCapture, handleClose]);

  const handleGalleryClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
      handleClose();
    }
  }, [onCapture, handleClose]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={<span className="font-black uppercase tracking-widest text-sm">{title}</span>}
      size="lg"
    >
      <div className="flex flex-col bg-slate-950 min-h-[400px] relative overflow-hidden">
        {/* Hidden Canvas & File Input */}
        <canvas ref={canvasRef} className="hidden" />
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange} 
        />

        {/* Viewfinder / Preview */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          {!capturedImage ? (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              {!isCameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-3">
                  <RefreshCw className="animate-spin" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Memulai Kamera...</p>
                </div>
              )}
            </>
          ) : (
            <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
          )}

          {/* Guidelines Overlay */}
          <div className="absolute inset-0 border-[20px] border-black/20 pointer-events-none">
            <div className="w-full h-full border border-white/20 rounded-xl" />
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 bg-slate-900 border-t border-slate-800">
          {!capturedImage ? (
            <div className="flex items-center justify-between gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGalleryClick}
                className="flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:text-white rounded-xl h-12 uppercase font-black text-[10px] tracking-widest"
              >
                <ImageIcon size={18} className="mr-2" /> Galeri
              </Button>

              <button 
                onClick={capturePhoto}
                disabled={!isCameraReady}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-2xl active:scale-90 transition-all disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-full border-4 border-slate-900" />
              </button>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={switchCamera}
                disabled={devices.length < 2}
                className="flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:text-white rounded-xl h-12 uppercase font-black text-[10px] tracking-widest"
              >
                <RefreshCw size={18} className="mr-2" /> Putar
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-xl bg-slate-800 border-slate-700 text-slate-300 font-black uppercase text-[10px] tracking-widest"
                onClick={() => {
                  setCapturedImage(null);
                  startCamera(activeDeviceId);
                }}
              >
                Ulangi
              </Button>
              <Button 
                variant="primary" 
                className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-900/20"
                onClick={handleConfirm}
              >
                <Check size={18} className="mr-2" /> Gunakan Foto
              </Button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition-all z-20"
        >
          <X size={20} />
        </button>
      </div>
    </Modal>
  );
};
