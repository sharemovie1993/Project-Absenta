import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import type { RapatSosialisasiSession } from '@/api/academic/sosialisasi.api';
import toast from 'react-hot-toast';

export interface RapatSosialisasiQrPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: RapatSosialisasiSession | null;
}

export const RapatSosialisasiQrPrintModal: React.FC<RapatSosialisasiQrPrintModalProps> = ({
  isOpen,
  onClose,
  session,
}) => {
  const printSheetRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(true);

  const { tenantInfo, rawSekolah } = usePrintHeaderData();

  // URL yang akan dibuka oleh kamera smartphone guru saat scan
  const publicPortalUrl = React.useMemo(() => {
    if (!session) return '';
    const origin = window.location.origin;
    const tId = tenantInfo?.id || session.tenant_id;
    return `${origin}/portal/sosialisasi-presensi?tenantId=${tId}&token=${session.qr_token}`;
  }, [session, tenantInfo]);

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
    if (!session?.tanggal) return 'Hari ini';
    try {
      const d = new Date(session.tanggal);
      if (isNaN(d.getTime())) return session.tanggal;
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return session.tanggal;
    }
  }, [session?.tanggal]);

  const handleDownloadPdf = async () => {
    if (!printSheetRef.current) return;
    try {
      setIsExportingPdf(true);
      toast.loading('Menyiapkan Lembar Cetak QR PDF...', { id: 'pdf-gen' });

      const html2canvasModule = await import('html2canvas-pro');
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const { jsPDF } = await import('jspdf');

      const target = printSheetRef.current.querySelector('.print-sheet') as HTMLElement || printSheetRef.current;
      const canvas = await html2canvas(target, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);

      const safeTitle = (session?.nama_acara || 'Lembar_QR_Sosialisasi').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`QR_Presensi_${safeTitle}_${session?.tanggal || '2026'}.pdf`);

      toast.success('Lembar QR Presensi berhasil diunduh!', { id: 'pdf-gen' });
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengunduh PDF: ' + (err.message || 'Error tidak diketahui'), { id: 'pdf-gen' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !session) return null;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Lembar Cetak QR Presensi Rapat Sosialisasi"
      subtitle={`${session.nama_acara} • ${formattedDate}`}
      orientation="portrait"
      allowOrientationToggle={false}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={() => setShowLogoDaerah(!showLogoDaerah)}
      onToggleLogoSekolah={() => setShowLogoSekolah(!showLogoSekolah)}
      onDownloadBatchPdf={handleDownloadPdf}
      isBatchDownloading={isExportingPdf}
      batchDownloadButtonText="Unduh Lembar QR (PDF)"
      onPrint={handlePrint}
    >
      <div ref={printSheetRef} className="flex flex-col items-center justify-center p-2 sm:p-4">
        <PrintDocumentSheet
          orientation="portrait"
          className="print-sheet bg-white text-slate-900 shadow-xl border border-slate-200 print:border-none print:shadow-none p-8 flex flex-col justify-between"
          footerText="Lembar Registrasi & Presensi Digital • Dicetak Otomatis oleh Sistem Absenta"
        >
          {/* ── KOP SURAT RESMI ── */}
          <div>
            <PrintHeader
              showLogoDaerah={showLogoDaerah}
              showLogoSekolah={showLogoSekolah}
            />

            {/* ── JUDUL DOKUMEN ── */}
            <div className="text-center mt-4 mb-4">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900 border-b-2 border-slate-900 inline-block pb-1">
                LEMBAR REGISTRASI & PRESENSI QR RAPAT SOSIALISASI
              </h2>
              <p className="text-xs font-semibold text-slate-700 mt-1 uppercase tracking-wider">
                {session.nama_acara}
              </p>
            </div>

            {/* ── RINCIAN WAKTU & TEMPAT ── */}
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 my-3 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="font-bold text-slate-600 block">Hari / Tanggal:</span>
                <span className="font-black text-slate-900">{formattedDate}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600 block">Waktu Pelaksanaan:</span>
                <span className="font-black text-slate-900">
                  {session.waktu_mulai} - {session.waktu_selesai} WIB
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-600 block">Tempat / Ruangan:</span>
                <span className="font-black text-slate-900">{session.tempat || 'Aula Pertemuan Sekolah'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600 block">Pimpinan Rapat:</span>
                <span className="font-black text-slate-900">{session.pimpinan_rapat || '-'}</span>
              </div>
            </div>

            {/* ── QR CODE DISPLAY BESAR & JERNIH ── */}
            <div className="flex flex-col items-center justify-center my-6">
              <div className="p-3 bg-white border-4 border-slate-900 rounded-2xl shadow-md inline-block">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Presensi Sosialisasi"
                    className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center bg-slate-100 rounded-lg animate-pulse text-xs text-slate-500 font-mono">
                    Memuat QR Code...
                  </div>
                )}
              </div>
              <p className="mt-2 text-[11px] font-mono text-slate-500 tracking-wider">
                TOKEN SESI: <span className="font-bold text-slate-800">{session.qr_token}</span>
              </p>
            </div>

            {/* ── PANDUAN LANGKAH PRESENSI BAGI GURU ── */}
            <div className="border border-slate-300 rounded-xl p-3.5 bg-amber-50/50">
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span>📱</span> Panduan Pengisian Presensi Peserta:
              </p>
              <ol className="text-xs text-slate-800 list-decimal list-inside space-y-1 leading-relaxed">
                <li>Buka aplikasi <strong>Kamera</strong> atau <strong>Pemindai QR</strong> di smartphone Anda.</li>
                <li>Arahkan kamera ke kode QR di atas hingga muncul tautan presensi di layar.</li>
                <li>Pilih nama Anda dari daftar peserta, lalu tekan tombol <strong>"Konfirmasi Kehadiran"</strong>.</li>
                <li>Kehadiran Anda akan langsung terverifikasi otomatis pada sistem Berita Acara Rapat.</li>
              </ol>
            </div>
          </div>

          {/* ── KOLOM TANDA TANGAN PANITIA PELAKSANA ── */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex justify-between items-end text-xs">
              <div className="text-left">
                <p className="text-[10px] text-slate-500">
                  Dokumen dicetak pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">ID Sesi: {session.id}</p>
              </div>

              <div className="text-center w-56">
                <p className="text-xs font-semibold text-slate-700">Panitia Pelaksana Sosialisasi,</p>
                <div className="h-14"></div>
                <p className="text-xs font-bold text-slate-900 underline">{session.notulis || 'Panitia Pelaksana'}</p>
                <p className="text-[11px] text-slate-600">Koordinator Administrasi</p>
              </div>
            </div>
          </div>
        </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};
