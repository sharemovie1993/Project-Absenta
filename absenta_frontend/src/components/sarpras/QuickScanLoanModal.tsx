import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { ScanLine, UserCheck, PackageCheck, Loader2, Camera, X } from 'lucide-react';
import { sarprasApi } from '../../api/sarpras.api';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useToast } from '../../hooks/useToast';
import { requestWithFallback } from '../../api/apiUtils';

interface QuickScanLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ScannedUser {
  id: string;
  full_name: string;
}

interface ScannedAsset {
  id: string;
  nama: string;
  kode: string;
  serial_number?: string;
}

export const QuickScanLoanModal: React.FC<QuickScanLoanModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [userStr, setUserStr] = useState('');
  const [assetStr, setAssetStr] = useState('');

  // Loaded Data
  const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
  const [scannedAsset, setScannedAsset] = useState<ScannedAsset | null>(null);

  const userInputRef = useRef<HTMLInputElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);

  const [useCamera, setUseCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const resetScan = useCallback(() => {
    setStep(1);
    setUserStr('');
    setAssetStr('');
    setScannedUser(null);
    setScannedAsset(null);
    setUseCamera(false);
  }, []);

  useEffect(() => {
    if (useCamera && videoRef.current) {
      const reader = new BrowserMultiFormatReader();
      zxingReaderRef.current = reader;
      reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (result && result.getText()) {
          const code = result.getText();
          if (step === 1) {
             setUserStr(code);
             lookupUserMutation.mutate(code);
          } else if (step === 2) {
             setAssetStr(code);
             lookupAssetMutation.mutate(code);
          }
          setUseCamera(false);
        }
      }).catch(console.error);
    } else {
      if (zxingReaderRef.current) {
        (zxingReaderRef.current as any).reset();
        zxingReaderRef.current = null;
      }
    }
    return () => {
      if (zxingReaderRef.current) {
        (zxingReaderRef.current as any).reset();
        zxingReaderRef.current = null;
      }
    }
  }, [useCamera, step, isOpen]);

  useEffect(() => {
    if (isOpen) {
      resetScan();
      setTimeout(() => userInputRef.current?.focus(), 100);
    }
  }, [isOpen, resetScan]);

  // Real API call checking User ID / NIS / NIP / RFID
  const lookupUserMutation = useMutation({
    mutationFn: async (id: string) => {
       const res = await sarprasApi.scanUser(id);
       if (!res?.data) throw new Error('Pengguna tidak ditemukan');
       return res.data as ScannedUser;
    },
    onSuccess: (data) => {
       setScannedUser(data);
       setStep(2);
       setTimeout(() => assetInputRef.current?.focus(), 100);
    },
    onError: () => {
       showToast('Pengguna tidak ditemukan berdasarkan barcode ini', 'error');
       setUserStr('');
    }
  });

  const lookupAssetMutation = useMutation({
    mutationFn: async (code: string) => {
       // Search via getAssets using the code as exact search
       const res = await sarprasApi.getAssets({ search: code, limit: 1 });
       if (res?.data?.list?.length > 0) {
          const match = res.data.list.find((a: { kode: string; serial_number?: string; id: string }) => a.kode === code || a.serial_number === code || a.id === code);
          if (match) return match as ScannedAsset;
       }
       throw new Error('Aset tidak ditemukan');
    },
    onSuccess: (data) => {
       setScannedAsset(data);
       if (scannedUser) {
         submitLoanMutation.mutate({ asset_id: data.id, user_id: scannedUser.id });
       }
    },
    onError: () => {
       showToast('Aset tidak ditemukan. Coba scan ulang', 'error');
       setAssetStr('');
    }
  });

  const submitLoanMutation = useMutation({
    mutationFn: async ({ asset_id, user_id }: { asset_id: string, user_id: string }) => {
       // Request loan
       const request = await sarprasApi.requestLoan({
          asset_id,
          catatan: 'Peminjaman Kilat Barcode',
       });
       
       // Force Approve/Active if Admin operates (assuming context)
       await sarprasApi.updateLoanStatus(request.data.id, { status: 'ACTIVE' });
       return request;
    },
    onSuccess: () => {
       showToast('Peminjaman Berhasil Dicatat!', 'success');
       queryClient.invalidateQueries({ queryKey: ['sarpras-loans'] });
       queryClient.invalidateQueries({ queryKey: ['sarpras-assets'] });
       queryClient.invalidateQueries({ queryKey: ['sarpras-stats'] });
       
       // Ready for next person
       setTimeout(() => resetScan(), 1000);
       setTimeout(() => userInputRef.current?.focus(), 1100);
    },
    onError: (err: unknown) => {
       let errMsg = 'Gagal meminjamkan barang';
       if (err instanceof Error) {
         errMsg = err.message;
       } else if (err && typeof err === 'object' && 'message' in err) {
         errMsg = String((err as { message: unknown }).message);
       }
       showToast(errMsg, 'error');
       setAssetStr('');
       setTimeout(() => assetInputRef.current?.focus(), 100);
    }
  });

  const handleUserParams = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && userStr.trim()) {
       lookupUserMutation.mutate(userStr.trim());
    }
  }, [userStr, lookupUserMutation]);

  const handleAssetParams = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && assetStr.trim()) {
       lookupAssetMutation.mutate(assetStr.trim());
    }
  }, [assetStr, lookupAssetMutation]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Peminjaman Kilat (Barcode Scanner)" size="md">
      <div className="space-y-6 pb-4">
         {/* Status Indicators */}
         <div className="flex items-center gap-4 justify-center">
            <div className={`p-3 rounded-full flex items-center justify-center border-2 transition-colors ${step >= 1 ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-slate-200 text-slate-400'}`}>
               <UserCheck size={24} />
            </div>
            <div className={`h-1 w-16 transition-colors ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
            <div className={`p-3 rounded-full flex items-center justify-center border-2 transition-colors ${step >= 2 ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-slate-200 text-slate-400'}`}>
               <PackageCheck size={24} />
            </div>
         </div>

         {/* Step 1: Scan User */}
         <div className={step === 1 ? 'block animate-in fade-in' : 'hidden'}>
            <div className="text-center mb-6">
               <h3 className="text-lg font-bold text-slate-800">Langkah 1: Identifikasi Peminjam</h3>
               <p className="text-sm text-slate-500">Arahkan scanner ke Kartu Pelajar / ID Card peminjam.</p>
            </div>
            
            <div className="relative">
               <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-6 w-6" />
               <Input 
                  ref={userInputRef}
                  value={userStr}
                  onChange={e => setUserStr(e.target.value)}
                  onKeyDown={handleUserParams}
                  placeholder="Scan Barcode ID..."
                  className="pl-12 py-4 text-lg font-mono text-center"
                  autoFocus
                  disabled={lookupUserMutation.isPending}
               />
               {lookupUserMutation.isPending && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin h-5 w-5" />
               )}
            </div>
            
            <div className="mt-4 text-center">
               <Button type="button" variant="outline" onClick={() => setUseCamera(true)}>
                  <Camera className="w-4 h-4 mr-2" /> Gunakan Kamera
               </Button>
            </div>
         </div>

         {/* Step 2: Scan Asset */}
         <div className={step === 2 ? 'block animate-in slide-in-from-right-4 fade-in' : 'hidden'}>
            
            {scannedUser && (
               <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg flex items-center gap-3 mb-6 outline outline-1 outline-emerald-200">
                  <div className="bg-emerald-200 p-2 rounded-full"><UserCheck size={16} className="text-emerald-700"/></div>
                  <div>
                     <p className="text-xs font-semibold text-emerald-600 uppercase">Peminjam Teridentifikasi</p>
                     <p className="font-bold text-sm">{scannedUser.full_name}</p>
                  </div>
               </div>
            )}

            <div className="text-center mb-6">
               <h3 className="text-lg font-bold text-slate-800">Langkah 2: Scan Barang Aset</h3>
               <p className="text-sm text-slate-500">Arahkan scanner ke label Barcode pada fisik Aset.</p>
            </div>

            <div className="relative">
               <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-6 w-6" />
               <Input 
                  ref={assetInputRef}
                  value={assetStr}
                  onChange={e => setAssetStr(e.target.value)}
                  onKeyDown={handleAssetParams}
                  placeholder="Scan Kode Aset..."
                  className="pl-12 py-4 text-lg font-mono text-center"
                  disabled={lookupAssetMutation.isPending || submitLoanMutation.isPending}
               />
               {(lookupAssetMutation.isPending || submitLoanMutation.isPending) && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin h-5 w-5" />
               )}
            </div>

            {submitLoanMutation.isPending && (
               <p className="text-center text-sm text-indigo-600 font-medium mt-4 animate-pulse">Menyiapkan transaksi peminjaman...</p>
            )}
            
            <div className="mt-4 text-center">
               <Button type="button" variant="outline" onClick={() => setUseCamera(true)}>
                  <Camera className="w-4 h-4 mr-2" /> Gunakan Kamera
               </Button>
            </div>
         </div>

         {useCamera && (
            <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center p-4">
               <div className="relative w-full max-w-sm bg-black rounded-lg overflow-hidden border border-white/20">
                  <video ref={videoRef} className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 border-2 border-dashed border-white/50 pointer-events-none scale-75 rounded-xl"></div>
                  <Button 
                     variant="ghost" 
                     className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full h-10 w-10 p-0"
                     onClick={() => setUseCamera(false)}
                  >
                     <X className="h-6 w-6" />
                  </Button>
               </div>
               <p className="text-white mt-4 font-medium text-lg">Arahkan QR Code ke bingkai</p>
            </div>
         )}
      </div>
    </Modal>
  );
};
