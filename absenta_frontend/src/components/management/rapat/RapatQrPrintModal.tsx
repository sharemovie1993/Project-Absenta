import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import type { RapatMasterItem } from '@/api/academic/rapat.api';
import toast from 'react-hot-toast';

export interface RapatQrPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  rapat: RapatMasterItem | null;
}

export const RapatQrPrintModal: React.FC<RapatQrPrintModalProps> = ({
  isOpen,
  onClose,
  rapat,
}) => {
  const printSheetRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(true);

  const { tenantInfo } = usePrintHeaderData();

  // URL yang akan dibuka oleh kamera smartphone peserta saat scan
  const publicPortalUrl = React.useMemo(() => {
    if (!rapat) return '';
    const origin = window.location.origin;
    const tId = tenantInfo?.id || rapat.tenant_id;
    return `${origin}/portal/sosialisasi-presensi?tenantId=${tId}&token=${rapat.qr_token}&rapatId=${rapat.id}`;
  }, [rapat, tenantInfo]);

  // Generate QR Code resolusi tinggi
  useEffect(() => {
    if (!publicPortalUrl) return;
    let active = true;

    QRCode.toDataURL(publicPortalUrl, {
      width: 450,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Gagal generate QR Code:', err);
      });

    return () => {
      active = false;
    };
  }, [publicPortalUrl]);

  // Format tanggal ramah bahasa Indonesia
  const formattedDate = React.useMemo(() => {
    if (!rapat?.tanggal_rapat) return 'Hari ini';
    try {
      const d = new Date(rapat.tanggal_rapat);
      if (isNaN(d.getTime())) return rapat.tanggal_rapat;
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return rapat.tanggal_rapat;
    }
  }, [rapat?.tanggal_rapat]);

  const handlePrintBrowser = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    if (!printSheetRef.current) return;
    try {
      setIsExportingPdf(true);
      toast.loading('Menyiapkan berkas PDF resmi...', { id: 'pdf-rapat-qr' });

      const html2pdf = (await import('html2pdf.js')).default;
      const element = printSheetRef.current;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `LEMBAR_PRESENSI_QR_${(rapat?.judul_rapat || 'RAPAT').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      await html2pdf().set(opt).from(element).save();
      toast.success('Berkas PDF lembar presensi berhasil diunduh!', { id: 'pdf-rapat-qr' });
    } catch (error) {
      console.error('Gagal cetak PDF:', error);
      toast.error('Gagal membuat PDF. Silakan gunakan tombol Cetak Browser.', { id: 'pdf-rapat-qr' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!isOpen || !rapat) return null;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Lembar Presensi QR Resmi Rapat"
      subtitle={`${rapat.judul_rapat} • Format Cetak A4 Portrait`}
      onPrint={handlePrintBrowser}
      onExportPdf={handleExportPdf}
      isExportingPdf={isExportingPdf}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={() => setShowLogoDaerah(!showLogoDaerah)}
      onToggleLogoSekolah={() => setShowLogoSekolah(!showLogoSekolah)}
    >
      <PrintDocumentSheet ref={printSheetRef} size="A4" orientation="portrait" padding="15mm">
        {/* Kop Surat Sekolah Resmi */}
        <PrintHeader showLogoDaerah={showLogoDaerah} showLogoSekolah={showLogoSekolah} />

        <div className="text-center my-3 pb-2 border-b border-slate-300">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
            LEMBAR PRESENSI KEHADIRAN RAPAT
          </h2>
          <p className="text-base font-semibold text-indigo-900 mt-0.5">
            {rapat.judul_rapat}
          </p>
          {rapat.nomor_surat && (
            <p className="text-xs font-mono text-slate-600">
              No. Undangan: {rapat.nomor_surat}
            </p>
          )}
        </div>

        {/* Tabel Metadata Pelaksanaan */}
        <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-4 text-xs text-slate-800">
          <table className="w-full">
            <tbody>
              <tr>
                <td className="w-28 font-semibold py-0.5 text-slate-600">Hari, Tanggal</td>
                <td className="w-3">:</td>
                <td className="font-medium text-slate-900">{formattedDate}</td>
                <td className="w-28 font-semibold py-0.5 text-slate-600 pl-4">Target Peserta</td>
                <td className="w-3">:</td>
                <td className="font-medium text-slate-900">{rapat.target_peserta.replace(/_/g, ' ')}</td>
              </tr>
              <tr>
                <td className="font-semibold py-0.5 text-slate-600">Waktu</td>
                <td>:</td>
                <td className="font-medium text-slate-900">
                  Pukul {rapat.jam_mulai} {rapat.jam_selesai ? `- ${rapat.jam_selesai}` : 's/d Selesai'} WIB
                </td>
                <td className="font-semibold py-0.5 text-slate-600 pl-4">Pimpinan Rapat</td>
                <td>:</td>
                <td className="font-medium text-slate-900">{rapat.pimpinan_rapat || 'Kepala Sekolah'}</td>
              </tr>
              <tr>
                <td className="font-semibold py-0.5 text-slate-600">Tempat</td>
                <td>:</td>
                <td className="font-medium text-slate-900">{rapat.tempat}</td>
                <td className="font-semibold py-0.5 text-slate-600 pl-4">Kategori</td>
                <td>:</td>
                <td className="font-medium text-slate-900">{rapat.kategori_rapat.replace(/_/g, ' ')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Kotak QR Code Besar True WYSIWYG */}
        <div className="flex flex-col items-center justify-center my-4 py-4 px-6 border-2 border-dashed border-indigo-400 bg-indigo-50/40 rounded-xl">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-950 mb-2">
            SCAN KODE QR DI BAWAH INI UNTUK PRESENSI MANDIRI
          </p>

          <div className="p-3 bg-white rounded-lg shadow-md border border-slate-300">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code Presensi Rapat" className="w-60 h-60 object-contain mx-auto" />
            ) : (
              <div className="w-60 h-60 flex items-center justify-center bg-slate-100 text-slate-400 text-xs">
                Membuat Kode QR...
              </div>
            )}
          </div>

          <div className="mt-3 text-center max-w-md">
            <p className="text-xs font-medium text-slate-700">
              Arahkan kamera smartphone atau aplikasi pemindai QR ke kode di atas.
            </p>
            <p className="text-[11px] font-mono text-slate-500 mt-1">
              Token Sesi: <span className="font-bold text-slate-800">{rapat.qr_token}</span>
            </p>
          </div>
        </div>

        {/* Petunjuk Penggunaan bagi Peserta */}
        <div className="mt-4 pt-3 border-t border-slate-200">
          <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide mb-1.5">
            Petunjuk Kehadiran:
          </h4>
          <ol className="list-decimal list-inside text-[11px] text-slate-700 space-y-1">
            <li>Nyalakan koneksi internet dan buka aplikasi kamera / browser di smartphone Anda.</li>
            <li>Arahkan kamera ke Kode QR di atas sampai muncul tautan konfirmasi kehadiran rapat.</li>
            <li>Pilih nama Anda atau masukkan NIP / NISN / Nomor Identitas untuk mencatat kehadiran.</li>
            <li>Jika mengalami kendala teknis pemindaian, silakan melapor ke Notulis / Panitia untuk pencatatan manual.</li>
          </ol>
        </div>

        {/* Tanda Tangan Pengesahan Panitia / Penanggung Jawab */}
        <div className="mt-8 flex justify-end">
          <div className="w-64 text-center text-xs text-slate-800">
            <p>Mengetahui / Penanggung Jawab,</p>
            <p className="font-semibold">{rapat.pimpinan_rapat || 'Kepala Sekolah'}</p>
            <div className="h-16" />
            <p className="font-bold underline text-slate-900">
              {rapat.pimpinan_rapat || 'Kepala Sekolah'}
            </p>
            <p className="text-[11px] text-slate-600">Pimpinan Rapat</p>
          </div>
        </div>
      </PrintDocumentSheet>
    </UniversalDocumentModal>
  );
};
