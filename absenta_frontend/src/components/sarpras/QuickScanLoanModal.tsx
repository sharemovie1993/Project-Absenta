import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ScanLine, UserCheck, PackageCheck, Loader2, Camera, X, Package } from 'lucide-react';
import { sarprasApi } from '../../api/sarpras.api';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { toast } from 'react-hot-toast';
import { SmartStudentPicker } from '../common/SmartStudentPicker';
import { useDebounce } from '../../hooks/useDebounce';

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

export const QuickScanLoanModal: React.FC<QuickScanLoanModalProps> = React.memo(({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [assetSearch, setAssetSearch] = useState('');
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const debouncedAssetSearch = useDebounce(assetSearch, 300);

  // Loaded Data
  const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
  const [scannedAsset, setScannedAsset] = useState<ScannedAsset | null>(null);

  const assetInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [useCamera, setUseCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const resetScan = useCallback(() => {
    setStep(1);
    setAssetSearch('');
    setScannedUser(null);
    setScannedAsset(null);
    setUseCamera(false);
    setShowAssetDropdown(false);
  }, []);

  // Fetch search results for assets
  const { data: assetsSearchResult, isLoading: loadingAssets } = useQuery({
    queryKey: ['sarpras-assets-search', debouncedAssetSearch],
    queryFn: () => sarprasApi.getAssets({ search: debouncedAssetSearch, is_loanable: 'true', limit: 10 }),
    enabled: isOpen && step === 2 && debouncedAssetSearch.trim().length > 0
  });

  const assetResults = useMemo(() => {
    return (assetsSearchResult?.data?.list as ScannedAsset[]) || [];
  }, [assetsSearchResult]);

  useEffect(() => {
    if (useCamera && videoRef.current) {
      const reader = new BrowserMultiFormatReader();
      zxingReaderRef.current = reader;
      reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (result && result.getText()) {
          const code = result.getText();
          if (step === 2) {
             setAssetSearch(code);
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
    }
  }, [isOpen, resetScan]);

  // Click outside listener to close asset dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowAssetDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
       toast.error('Aset tidak ditemukan. Coba scan ulang');
       setAssetSearch('');
    }
  });

  const submitLoanMutation = useMutation({
    mutationFn: async ({ asset_id, user_id }: { asset_id: string, user_id: string }) => {
       // Request loan
       const request = await sarprasApi.requestLoan({
          asset_id,
          peminjam_id: user_id,
          catatan: 'Peminjaman Kilat Barcode',
       });
       
       // Force Approve/Active transition
       await sarprasApi.updateLoanStatus(request.data.id, { status: 'APPROVED' });
       await sarprasApi.updateLoanStatus(request.data.id, { status: 'ACTIVE' });
       return request;
    },
    onSuccess: () => {
       toast.success('Peminjaman Berhasil Dicatat!');
       queryClient.invalidateQueries({ queryKey: ['sarpras-loans'] });
       queryClient.invalidateQueries({ queryKey: ['sarpras-assets'] });
       queryClient.invalidateQueries({ queryKey: ['sarpras-stats'] });
       
       // Ready for next person
       setTimeout(() => resetScan(), 1000);
    },
    onError: (err: unknown) => {
       let errMsg = 'Gagal meminjamkan barang';
       if (err && typeof err === 'object' && 'response' in err) {
         const resErr = err as { response?: { data?: { message?: string } } };
         if (resErr.response?.data?.message) {
            errMsg = resErr.response.data.message;
         }
       } else if (err instanceof Error) {
         errMsg = err.message;
       }
       toast.error(errMsg);
       setAssetSearch('');
       setTimeout(() => assetInputRef.current?.focus(), 100);
    }
  });

  const handleSelectAsset = (asset: ScannedAsset) => {
    setScannedAsset(asset);
    if (scannedUser) {
      submitLoanMutation.mutate({ asset_id: asset.id, user_id: scannedUser.id });
    }
  };

  const handleAssetParams = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && assetSearch.trim()) {
       lookupAssetMutation.mutate(assetSearch.trim());
    }
  }, [assetSearch, lookupAssetMutation]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Peminjaman Kilat (Barcode Scanner)" size="md">
      <div className="space-y-6 pb-4" ref={containerRef}>
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

         {/* Step 1: Scan / Search User */}
         <div className={step === 1 ? 'block animate-in fade-in pb-48' : 'hidden'}>
            <div className="text-center mb-6">
               <h3 className="text-lg font-bold text-slate-800">Langkah 1: Identifikasi Peminjam</h3>
               <p className="text-sm text-slate-500">Scan kartu identitas (RFID/Barcode) atau cari nama siswa/guru.</p>
            </div>
            
            <div className="bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
               <SmartStudentPicker
                  mode="universal"
                  scope="global"
                  autoFocus
                  onSelect={(student) => {
                     if (!student.user_id) {
                        toast.error('Pengguna terpilih tidak memiliki akun pengguna yang aktif di sistem.');
                        return;
                     }
                     setScannedUser({
                        id: student.user_id,
                        full_name: student.nama_siswa || student.nama_guru || student.full_name || 'Pengguna'
                     });
                     setStep(2);
                     setTimeout(() => assetInputRef.current?.focus(), 100);
                  }}
                  placeholder="Scan RFID atau ketik nama/NIS/NIP..."
               />
            </div>
         </div>

         {/* Step 2: Scan Asset */}
         <div className={step === 2 ? 'block animate-in slide-in-from-right-4 fade-in pb-48' : 'hidden'}>
            
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
               <p className="text-sm text-slate-500">Arahkan scanner ke label Barcode atau ketik nama/kode aset.</p>
            </div>

            <div className="relative">
               <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-6 w-6" />
               <Input 
                  ref={assetInputRef}
                  value={assetSearch}
                  onChange={e => {
                    setAssetSearch(e.target.value);
                    setShowAssetDropdown(true);
                  }}
                  onFocus={() => setShowAssetDropdown(true)}
                  onKeyDown={handleAssetParams}
                  placeholder="Ketik nama / scan kode aset..."
                  className="pl-12 py-4 text-lg font-mono text-center"
                  disabled={lookupAssetMutation.isPending || submitLoanMutation.isPending}
                  autoComplete="off"
               />
               {(lookupAssetMutation.isPending || submitLoanMutation.isPending || loadingAssets) && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin h-5 w-5" />
               )}

               {/* Asset Search Dropdown */}
               {showAssetDropdown && assetResults.length > 0 && (
                 <div className="absolute z-[100] mt-2 w-full bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden max-h-[220px] overflow-y-auto">
                   <div className="p-2 space-y-1">
                     {assetResults.map((item) => (
                       <button
                         key={item.id}
                         type="button"
                         onClick={() => {
                           setAssetSearch('');
                           setShowAssetDropdown(false);
                           handleSelectAsset(item);
                         }}
                         className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl transition-colors text-left border-b border-gray-50 dark:border-slate-800/50 last:border-0 group"
                       >
                         <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 transition-colors">
                           <Package size={16} />
                         </div>
                         <div>
                           <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{item.nama}</p>
                           <p className="text-xs text-slate-500">{item.kode || 'Tanpa Kode'}</p>
                         </div>
                       </button>
                     ))}
                   </div>
                 </div>
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
});
