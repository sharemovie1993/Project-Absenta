import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Printer, X } from 'lucide-react';
import type { Asset } from '../../api/sarpras.api';

interface AssetPrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetsToPrint: Asset[];
}

export const AssetPrintLabelModal: React.FC<AssetPrintLabelModalProps> = ({
  isOpen,
  onClose,
  assetsToPrint
}) => {
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && assetsToPrint.length > 0) {
      const generated: Record<string, string> = {};
      
      const generateCodes = async () => {
        for (const asset of assetsToPrint) {
           const codeStr = asset.kode || asset.serial_number || asset.id;
           try {
             generated[asset.id] = await QRCode.toDataURL(codeStr, { 
                width: 200, 
                margin: 1,
                errorCorrectionLevel: 'H'
             });
           } catch {
             generated[asset.id] = '';
           }
        }
        setQrCodes(generated);
      };

      generateCodes();
    }
  }, [isOpen, assetsToPrint]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cetak Label Aset" size="xl">
      <div className="space-y-4">
        <div className="bg-amber-50 text-amber-800 p-3 rounded text-sm print:hidden">
          Pastikan format pengaturan cetak pada browser di-set tanpa margin (None) dan tanpa header/footer untuk hasil terbaik.
        </div>

        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={onClose}><X className="w-4 h-4 mr-2" /> Batal</Button>
          <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700">
             <Printer className="w-4 h-4 mr-2" /> Cetak Sekarang
          </Button>
        </div>

        {/* Print Area - Grid of labels */}
        <div 
          className="print-area bg-slate-100 p-4 rounded-xl overflow-y-auto max-h-[60vh] print:max-h-none print:overflow-visible print:bg-white print:p-0"
        >
           <style>{`
             @media print {
               body * { visibility: hidden; }
               .print-area, .print-area * { visibility: visible; }
               .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; background: white; margin: 0; }
               .print-page-break { page-break-inside: avoid; }
             }
           `}</style>
           
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
             {assetsToPrint.map((asset) => (
                <div key={asset.id} className="print-page-break flex flex-col items-center bg-white border border-slate-300 rounded overflow-hidden p-2 shadow-sm print:shadow-none print:border-black">
                   <div className="w-full text-center border-b border-slate-200 print:border-black pb-1 mb-2">
                      <span className="text-[10px] font-bold block uppercase break-words truncate">SARPRAS SMK</span>
                      <span className="text-[9px] block uppercase text-slate-500 truncate">{asset.Location?.nama || 'UMUM'}</span>
                   </div>
                   
                   <p className="text-[11px] font-semibold text-center leading-tight mb-2 h-8 line-clamp-2">{asset.nama}</p>
                   
                   {qrCodes[asset.id] ? (
                      <img src={qrCodes[asset.id]} alt={`QR ${asset.kode}`} className="w-24 h-24 object-contain" />
                   ) : (
                      <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-[10px]">Generating...</div>
                   )}
                   
                   <div className="mt-2 text-center w-full bg-slate-50 print:bg-transparent pt-1 border-t border-slate-100 print:border-slate-300">
                      <span className="text-[11px] font-mono font-bold tracking-widest">{asset.kode || asset.serial_number || asset.id.substring(0,8)}</span>
                      <span className="block text-[8px] text-slate-500 mt-0.5">Input Manual ID</span>
                   </div>
                </div>
             ))}
           </div>
        </div>
      </div>
    </Modal>
  );
};
