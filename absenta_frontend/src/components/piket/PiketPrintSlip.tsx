import React from 'react';
import type { IzinKeluarSiswa } from '../../api/piket.api';
import type { SystemConfig } from '../../services/systemConfig';
import { PrintHeader } from '../ui/PrintHeader';

interface PiketPrintSlipProps {
  printedPermit: (IzinKeluarSiswa & { qrCodeUrl?: string }) | null;
  tenantInfo?: {
    kepala_sekolah?: string;
    nip_kepala?: string;
    name?: string;
    kota?: string;
    [key: string]: any;
  } | null;
  systemConfig?: SystemConfig | null;
  user?: {
    full_name?: string;
    name?: string;
    [key: string]: any;
  } | null;
  printPaperSize?: string;
}

export const PiketPrintSlip: React.FC<PiketPrintSlipProps> = React.memo(({
  printedPermit,
  tenantInfo,
  systemConfig,
  user,
  printPaperSize = '58mm'
}) => {
  if (!printedPermit) return null;

  const isFormalPaper = printPaperSize === 'a4' || printPaperSize === 'a5';

  // Calculate dynamic CSS scaling factor to guarantee the Kop is EXACTLY identical to A4 layout but scaled down
  const baseWidth = 720;  // Standard web printable width for full Kop resolution
  const baseHeight = 215; // Total height of standard PrintHeader + scaled document title to prevent vertical layout shifting
  
  let scaleFactor = 1.0;
  if (printPaperSize === '58mm') {
    scaleFactor = 0.30;
  } else if (printPaperSize === '80mm') {
    scaleFactor = 0.41;
  } else if (printPaperSize === 'a6') {
    scaleFactor = 0.55;
  }

  // Styles for the rest of the slip elements based on the preset paper size
  const presetStyles = {
    '58mm': {
      infoText: 'text-[4.5px]',
      titleText: 'text-[8px]',
      bodyText: 'text-[7.5px]',
      gap: 'space-y-0.5',
      padding: 'px-1 py-1',
    },
    '80mm': {
      infoText: 'text-[6px]',
      titleText: 'text-[10.5px]',
      bodyText: 'text-[9.5px]',
      gap: 'space-y-1',
      padding: 'px-2 py-1.5',
    },
    'a6': {
      infoText: 'text-[7px]',
      titleText: 'text-[12px]',
      bodyText: 'text-[11px]',
      gap: 'space-y-1',
      padding: 'px-3 py-2',
    }
  };

  const styles = presetStyles[printPaperSize as keyof typeof presetStyles] || presetStyles['80mm'];

  return (
    <div className={`hidden print:block print-sheet-receipt bg-white text-gray-900 leading-relaxed mx-auto border border-gray-100 ${
      isFormalPaper ? 'font-sans p-6' : 'font-sans'
    }`} style={!isFormalPaper ? { padding: styles.padding } : undefined}>
      
      {/* Header Kop Resolution */}
      {isFormalPaper ? (
        <>
          <PrintHeader variant="portrait" tenantInfo={tenantInfo} />
          <div className="text-center mb-6 space-y-1">
            <h2 className="text-sm font-black underline tracking-wide uppercase leading-none">SURAT IZIN KELUAR SISWA</h2>
            <p className="text-[10px] font-mono font-bold text-gray-500">
              Nomor: {printedPermit.id.substring(0, 8).toUpperCase()}/SIKS/{new Date(printedPermit.jam_keluar).getFullYear()}
            </p>
          </div>
        </>
      ) : (
        <div className="w-full flex flex-col items-center">
          {/* World-Class CSS Scaling Container: Renders BOTH Kop and Title horizontally at high-res (720px) and scales them down perfectly */}
          <div 
            className="relative w-full overflow-hidden shrink-0 select-none mb-1.5" 
            style={{ height: `${baseHeight * scaleFactor}px` }}
          >
            <div 
              style={{
                width: `${baseWidth}px`,
                transform: `scale(${scaleFactor})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
              className="flex flex-col items-center"
            >
              <PrintHeader variant="portrait" tenantInfo={tenantInfo} />
              
              {/* Scaled Document Title (Smart scaling across all sizes) */}
              <div className="text-center w-full mt-4 space-y-1">
                <h2 className="text-xl font-black underline tracking-wide uppercase leading-none whitespace-nowrap text-gray-900">
                  SURAT IZIN KELUAR SISWA
                </h2>
                <p className="text-xs font-mono font-bold text-gray-400 uppercase">
                  Nomor: {printedPermit.id.substring(0, 8).toUpperCase()}/SIKS/{new Date(printedPermit.jam_keluar).getFullYear()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Details (No wrapping, proportional text sizes) */}
      <div className={`pb-2 border-b ${
        isFormalPaper ? 'space-y-3 mb-3 border-solid border-gray-300' : `${styles.gap} mb-2 border-dashed border-gray-900`
      }`}>
        <div>
          <span className={`uppercase text-gray-400 block font-bold ${isFormalPaper ? 'text-[9px]' : styles.infoText}`}>
            Nama Siswa:
          </span>
          <span className={`font-black uppercase block whitespace-nowrap overflow-hidden text-ellipsis ${isFormalPaper ? 'text-xs' : styles.bodyText}`}>
            {printedPermit.SiswaAkademik?.siswa.nama_siswa}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className={`uppercase text-gray-400 block font-bold ${isFormalPaper ? 'text-[9px]' : styles.infoText}`}>
              NIS:
            </span>
            <span className={`font-black uppercase block whitespace-nowrap overflow-hidden text-ellipsis ${isFormalPaper ? 'text-xs' : styles.bodyText}`}>
              {printedPermit.SiswaAkademik?.siswa.nis}
            </span>
          </div>
          <div>
            <span className={`uppercase text-gray-400 block font-bold ${isFormalPaper ? 'text-[9px]' : styles.infoText}`}>
              Kelas:
            </span>
            <span className={`font-black uppercase block whitespace-nowrap overflow-hidden text-ellipsis ${isFormalPaper ? 'text-xs' : styles.bodyText}`}>
              {printedPermit.SiswaAkademik?.kelas?.nama_kelas || '-'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className={`uppercase text-gray-400 block font-bold ${isFormalPaper ? 'text-[9px]' : styles.infoText}`}>
              Tipe Izin:
            </span>
            <span className={`font-black uppercase block whitespace-nowrap overflow-hidden text-ellipsis ${isFormalPaper ? 'text-xs' : styles.bodyText}`}>
              {printedPermit.tipe_izin === 'PULANG_AWAL' ? 'PULANG CEPAT' : 'IZIN SEMENTARA'}
            </span>
          </div>
          <div>
            <span className={`uppercase text-gray-400 block font-bold ${isFormalPaper ? 'text-[9px]' : styles.infoText}`}>
              Status:
            </span>
            <span className={`font-black uppercase block whitespace-nowrap overflow-hidden text-ellipsis ${isFormalPaper ? 'text-xs' : styles.bodyText}`}>
              {printedPermit.status}
            </span>
          </div>
        </div>

        <div>
          <span className={`uppercase text-gray-400 block font-bold ${isFormalPaper ? 'text-[9px]' : styles.infoText}`}>
            Keperluan / Alasan:
          </span>
          <span className={`font-bold block italic whitespace-nowrap overflow-hidden text-ellipsis ${isFormalPaper ? 'text-xs' : styles.bodyText}`}>
            "{printedPermit.alasan}"
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className={`uppercase text-gray-400 block font-bold ${isFormalPaper ? 'text-[9px]' : styles.infoText}`}>
              Jam Keluar:
            </span>
            <span className={`font-black block whitespace-nowrap ${isFormalPaper ? 'text-xs' : styles.bodyText}`}>
              {new Date(printedPermit.jam_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
            </span>
          </div>
          <div>
            <span className={`uppercase text-gray-400 block font-bold ${isFormalPaper ? 'text-[9px]' : styles.infoText}`}>
              Jam Kembali:
            </span>
            <span className={`font-black block whitespace-nowrap ${isFormalPaper ? 'text-xs' : styles.bodyText}`}>
              {printedPermit.jam_kembali 
                ? `${new Date(printedPermit.jam_kembali).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` 
                : '-'}
            </span>
          </div>
        </div>

        {printedPermit.tipe_izin === 'IZIN_KELUAR' && !printedPermit.jam_kembali && systemConfig?.max_izin_sementara_menit && (
          <div className={`mt-1 p-1 bg-gray-50 border border-dashed border-gray-300 rounded text-center`}>
            <span className={`font-black uppercase block ${isFormalPaper ? 'text-[10px]' : 'text-[6px]'} text-rose-600 animate-pulse`}>
              ⚠️ MAKSIMAL DURASI IZIN: {systemConfig.max_izin_sementara_menit} MENIT
            </span>
            <span className={`block font-medium italic ${isFormalPaper ? 'text-[8px]' : 'text-[5px]'} text-gray-500`}>
              * Jika melebihi batas waktu, status otomatis menjadi ALPA (Bolos).
            </span>
          </div>
        )}
      </div>

      {/* Footer / QR + Signature Row */}
      {!isFormalPaper ? (
        <div className="grid grid-cols-3 items-end text-center pt-2 mt-1 select-none">
          {/* Column 1: Guru Piket */}
          <div className="flex flex-col items-center justify-end pb-1 text-[6.5px] leading-tight">
            <p className="mb-4 text-gray-500 font-bold uppercase tracking-tighter">Guru Piket,</p>
            <p className={`font-black underline uppercase text-center tracking-tighter ${styles.bodyText}`}>
              {printedPermit.GuruPiket?.nama_guru?.substring(0, 11) || user?.full_name?.substring(0, 11) || 'Guru Piket'}
            </p>
          </div>

          {/* Column 2: QR Code in the middle */}
          <div className="flex flex-col items-center justify-center shrink-0 border-l border-r border-dashed border-gray-200 px-1">
            <span className="text-[5px] uppercase text-gray-400 block font-bold mb-0.5 tracking-tighter">Pindai Gerbang</span>
            <img 
              src={printedPermit.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=80&data=${encodeURIComponent(printedPermit.id)}`} 
              alt="Security QR"
              className="w-13 h-13 border border-gray-100 bg-white p-0.5 shrink-0"
            />
            <span className="text-[4.5px] font-bold block tracking-tighter font-mono text-gray-400 mt-0.5">
              ID: {printedPermit.id.substring(0, 6).toUpperCase()}
            </span>
          </div>

          {/* Column 3: Siswa */}
          <div className="flex flex-col items-center justify-end pb-1 text-[6.5px] leading-tight">
            <p className="mb-4 text-gray-500 font-bold uppercase tracking-tighter">Siswa,</p>
            <p className={`font-black underline uppercase text-center tracking-tighter ${styles.bodyText}`}>
              {printedPermit.SiswaAkademik?.siswa.nama_siswa?.substring(0, 11) || 'Siswa'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Standard separate layout for A4/A5 */}
          <div className={`text-center space-y-1 mb-3 pb-3 border-b border-solid border-gray-300`}>
            <span className="uppercase text-gray-400 block font-bold text-[9px]">Pindai di Gerbang:</span>
            <img 
              src={printedPermit.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(printedPermit.id)}`} 
              alt="Security Checkpass QR"
              className="mx-auto w-26 h-26 border border-gray-100 bg-white p-1"
            />
            <span className="text-[7px] font-bold block select-all tracking-wider font-mono text-gray-400">
              ID: {printedPermit.id.substring(0, 8).toUpperCase()}...
            </span>
          </div>

          <div className="grid grid-cols-2 text-center text-[9px] pt-1">
            <div>
              <p className="mb-10 text-xs">Guru Piket,</p>
              <p className="font-black underline uppercase text-xs">
                ({printedPermit.GuruPiket?.nama_guru || user?.full_name || user?.name || '................'})
              </p>
            </div>
            <div>
              <p className="mb-10 text-xs">Siswa,</p>
              <p className="font-black underline uppercase text-xs">
                ({printedPermit.SiswaAkademik?.siswa.nama_siswa?.substring(0, 15)})
              </p>
            </div>
          </div>
        </>
      )}

      {/* Small footer warning */}
      <div className="text-center text-[6px] text-gray-400 mt-3.5 border-t border-gray-100 pt-1 italic leading-tight">
        * Slip ini wajib dibawa oleh siswa dan diserahkan kepada Satpam saat melewati pintu gerbang sekolah.
      </div>
    </div>
  );
});
