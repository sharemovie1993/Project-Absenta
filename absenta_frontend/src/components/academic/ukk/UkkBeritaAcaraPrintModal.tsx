import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Download,
  Calendar,
  MapPin,
  CheckCircle2,
  SlidersHorizontal,
  Smartphone,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PrintHeader, usePrintHeaderData } from '@/components/ui/PrintHeader';
import {
  generatePdfUkkBeritaAcara,
  type UkkBeritaAcaraItem,
  type UkkBeritaAcaraPrintData,
} from '@/utils/print/modules/pdfUkkBeritaAcara';
import toast from 'react-hot-toast';

export interface UkkBeritaAcaraPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  beritaAcara: UkkBeritaAcaraItem | null;
  jurusanNama?: string;
  tahunPelajaran?: string;
  judulPenugasan?: string;
}

export const UkkBeritaAcaraPrintModal: React.FC<UkkBeritaAcaraPrintModalProps> = ({
  isOpen,
  onClose,
  beritaAcara,
  jurusanNama = 'Kejuruan',
  tahunPelajaran,
  judulPenugasan = 'Ujian Praktik Kejuruan Mandiri',
}) => {
  const printRef = useRef<HTMLDivElement | null>(null);
  const deskContainerRef = useRef<HTMLDivElement | null>(null);

  // Toggle Logos state
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);

  // Mobile Adaptive Zoom mode: 'fit' (auto scale to screen width) vs 'original' (100% A4 size)
  const [zoomMode, setZoomMode] = useState<'fit' | 'original'>('fit');
  const [autoScale, setAutoScale] = useState<number>(1);

  // Auto calculate scale for mobile viewport
  useEffect(() => {
    const calcScale = () => {
      if (!deskContainerRef.current) return;
      const containerWidth = deskContainerRef.current.clientWidth;
      const a4Width = 794; // 210mm in pixels at 96 DPI
      if (zoomMode === 'original') {
        setAutoScale(1);
      } else if (containerWidth < a4Width + 24) {
        const calculated = Math.max(0.35, Math.min(1, (containerWidth - 24) / a4Width));
        setAutoScale(calculated);
      } else {
        setAutoScale(1);
      }
    };

    calcScale();
    const timer = setTimeout(calcScale, 150);
    window.addEventListener('resize', calcScale);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calcScale);
    };
  }, [zoomMode, isOpen]);

  // Universal Hook: Resolves active Tenant & Sekolah data, plus pre-converts logos to Base64
  const { tenantInfo, logoDaerahBase64, logoSekolahBase64, rawSekolah } = usePrintHeaderData();
  const sekolahData = rawSekolah;

  if (!beritaAcara) return null;

  const hasPhotos = Boolean(beritaAcara.foto_dokumentasi && beritaAcara.foto_dokumentasi.length > 0);

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      const payload: UkkBeritaAcaraPrintData = {
        jurusanNama,
        tahunPelajaran: tahunPelajaran || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        judulPenugasan,
        sekolah: {
          nama: tenantInfo.name || 'SEKOLAH MENENGAH KEJURUAN',
          alamat: tenantInfo.address || '',
          kota: (rawSekolah as any)?.kota || 'Purwakarta',
          telepon: tenantInfo.phone,
          email: tenantInfo.email,
          website: tenantInfo.website,
          kepala_sekolah: (rawSekolah as any)?.kepala_sekolah || 'Kepala Sekolah',
          nip_kepala: (rawSekolah as any)?.nip_kepala || '-',
          nama_dinas_atas: tenantInfo.nama_dinas_atas,
          nama_dinas_bawah: tenantInfo.nama_dinas_bawah,
          nama_cabang_dinas: tenantInfo.nama_cabang_dinas,
          print_header_lines: tenantInfo.print_header_lines,
        },
        options: {
          logoDaerahBase64: showLogoDaerah ? logoDaerahBase64 : null,
          logoSekolahBase64: showLogoSekolah ? logoSekolahBase64 : null,
        },
        beritaAcara,
      };

      const { blobUrl } = generatePdfUkkBeritaAcara(payload);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `BERITA_ACARA_UKK_${beritaAcara.nama_sesi.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error('Gagal mengunduh dokumen PDF');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Cetak Berita Acara UKK"
      size="5xl"
    >
      <div className="space-y-4">
        {/* Action Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-3 border-b">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Sesi:</span>
            <span className="text-xs font-bold text-foreground bg-primary/10 text-primary px-2.5 py-1 rounded-md">
              {beritaAcara.nama_sesi}
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              • Format Standar A4 Portrait (210 × 297 mm)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mobile / Responsive Zoom Controller */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setZoomMode('fit')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1',
                  zoomMode === 'fit'
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Sesuaikan dokumen dengan lebar layar HP"
              >
                <Smartphone className="w-3 h-3" />
                <span>Pas Layar {autoScale < 1 ? `(${Math.round(autoScale * 100)}%)` : ''}</span>
              </button>
              <button
                type="button"
                onClick={() => setZoomMode('original')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1',
                  zoomMode === 'original'
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Lihat ukuran 100% standar A4 (dapat digeser)"
              >
                <Maximize2 className="w-3 h-3" />
                <span>100% Asli</span>
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              className="text-xs gap-1.5 h-8 px-2.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleBrowserPrint}
              className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-8 px-2.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </Button>
          </div>
        </div>

        {/* Kontrol Toggle Logo Kop Surat */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3 py-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11.5px]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              Kop:
            </span>

            {/* Checkbox Logo Kiri Pemda */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                id="toggle-logo-kiri"
                checked={showLogoDaerah}
                onChange={(e) => setShowLogoDaerah(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
              />
              <span className="text-slate-700 dark:text-slate-300 group-hover:text-foreground font-medium text-[11.5px]">
                Logo Kiri (Pemda)
              </span>
            </label>

            {/* Checkbox Logo Kanan Sekolah */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                id="toggle-logo-kanan"
                checked={showLogoSekolah}
                onChange={(e) => setShowLogoSekolah(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
              />
              <span className="text-slate-700 dark:text-slate-300 group-hover:text-foreground font-medium text-[11.5px]">
                Logo Kanan (Sekolah)
              </span>
            </label>
          </div>

          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${showLogoSekolah ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span>Logo Kanan: <strong className={showLogoSekolah ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}>{showLogoSekolah ? 'Aktif' : 'Nonaktif'}</strong></span>
          </div>
        </div>

        {/* Printable Paper Preview (Desk Container with Discrete A4 Sheets) */}
        <div
          ref={deskContainerRef}
          className="overflow-y-auto overflow-x-auto max-h-[76vh] p-2 sm:p-8 bg-slate-200/70 dark:bg-slate-950/80 rounded-xl border flex flex-col items-center gap-8 select-text"
        >
          <div
            ref={printRef}
            id="print-area-berita-acara"
            style={{
              zoom: autoScale < 1 ? autoScale : undefined,
              width: '794px',
              maxWidth: zoomMode === 'original' ? '794px' : undefined,
            }}
            className="flex flex-col items-center gap-8 transition-all duration-150"
          >
            {/* ========================================================================= */}
            {/* LEMBAR 1: NASKAH UTAMA BERITA ACARA UKK (STANDAR A4 PORTRAIT)              */}
            {/* ========================================================================= */}
            <div
              className="print-sheet w-[794px] min-w-[794px] max-w-[794px] min-h-[1123px] bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-sm font-serif text-[12px] leading-relaxed border border-slate-300 dark:border-slate-800 flex flex-col justify-between"
            >
              <div>
            {/* === KOP SURAT RESMI MENGGUNAKAN KOMPONEN PrintHeader.tsx === */}
            <PrintHeader
              variant="portrait"
              tenantInfo={tenantInfo}
              showLogoDaerah={showLogoDaerah}
              showLogoSekolah={showLogoSekolah}
            />

            {/* Title */}
            <div className="text-center my-4 space-y-0.5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                BERITA ACARA PELAKSANAAN
              </h3>
              <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                UJI KOMPETENSI KEAHLIAN (UKK)
              </h3>
              <p className="text-[11px] font-normal italic text-slate-700">
                Tahun Pelajaran {tahunPelajaran || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`}
              </p>
            </div>

            {/* Narration */}
            <p className="text-justify indent-8 my-4 text-[11.5px] leading-normal">
              Pada hari ini, tanggal <strong>{beritaAcara.tanggal}</strong>, bertempat di Ruang/Laboratorium{' '}
              <strong>{beritaAcara.ruang}</strong> {tenantInfo.name || 'SMK'}, telah diselenggarakan
              Ujian Kompetensi Keahlian (UKK) untuk Program Keahlian <strong>{jurusanNama}</strong> dengan rincian pelaksanaan sebagai berikut:
            </p>

            {/* Key Information Table */}
            <table className="w-full my-3 text-[11.5px] border-collapse">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="w-6 py-1 align-top font-bold">1.</td>
                  <td className="w-48 py-1 align-top font-semibold">Sesi Pelaksanaan</td>
                  <td className="py-1 align-top">
                    : {beritaAcara.nama_sesi} (Pukul {beritaAcara.jam_mulai} s.d {beritaAcara.jam_selesai} WIB)
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 align-top font-bold">2.</td>
                  <td className="py-1 align-top font-semibold">Program Keahlian</td>
                  <td className="py-1 align-top">: {jurusanNama}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 align-top font-bold">3.</td>
                  <td className="py-1 align-top font-semibold">Judul Penugasan / Soal</td>
                  <td className="py-1 align-top">: {judulPenugasan}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 align-top font-bold">4.</td>
                  <td className="py-1 align-top font-semibold">Jumlah Peserta Terdaftar</td>
                  <td className="py-1 align-top">: {beritaAcara.jumlah_peserta} Orang</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 align-top font-bold">5.</td>
                  <td className="py-1 align-top font-semibold">Jumlah Peserta Hadir</td>
                  <td className="py-1 align-top font-bold text-emerald-800">: {beritaAcara.jumlah_hadir} Orang</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 align-top font-bold">6.</td>
                  <td className="py-1 align-top font-semibold">Jumlah Tidak Hadir</td>
                  <td className="py-1 align-top font-bold text-rose-800">: {beritaAcara.jumlah_tidak_hadir} Orang</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 align-top font-bold">7.</td>
                  <td className="py-1 align-top font-semibold">Penguji Internal (Guru)</td>
                  <td className="py-1 align-top">: {beritaAcara.penguji_internal || '-'}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 align-top font-bold">8.</td>
                  <td className="py-1 align-top font-semibold">Penguji Eksternal (DU/DI)</td>
                  <td className="py-1 align-top">
                    : {beritaAcara.penguji_eksternal || '-'}{' '}
                    {beritaAcara.mitra_nama ? `(${beritaAcara.mitra_nama})` : ''}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Catatan Pelaksanaan */}
            <div className="my-4">
              <p className="font-bold text-[11.5px] mb-1">Catatan Pelaksanaan & Jalannya Ujian:</p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] leading-relaxed italic">
                {beritaAcara.catatan_pelaksanaan ||
                  'Ujian UKK berjalan dengan tertib, aman, dan mematuhi seluruh standar SOP keselamatan kerja dan instrumen penilaian kejuruan.'}
              </div>
            </div>

            {/* Kendala if any */}
            {beritaAcara.kendala && (
              <div className="my-3">
                <p className="font-bold text-[11.5px] mb-1">Kendala yang Dihadapi & Solusi:</p>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] leading-relaxed">
                  {beritaAcara.kendala}
                </div>
              </div>
            )}

            <p className="my-4 text-[11.5px] leading-normal">
              Demikian Berita Acara ini dibuat dengan sebenarnya sesuai dengan kondisi pelaksanaan di lapangan untuk dapat dipergunakan sebagaimana mestinya.
            </p>

            {/* Signature Blocks with Digital Pen Stamps */}
            <div className="mt-8 pt-2">
              <div className="text-right text-[11px] mb-4">
                {sekolahData?.kota || 'Purwakarta'}, {beritaAcara.tanggal}
              </div>

              {/* Baris 1: Penguji Internal & Penguji Eksternal */}
              <div className="grid grid-cols-2 gap-8 text-center text-[11.5px]">
                <div>
                  <p className="font-normal">Penguji Internal,</p>
                  <div className="h-16 flex items-center justify-center my-1">
                    {beritaAcara.ttd_penguji_internal ? (
                      <img
                        src={beritaAcara.ttd_penguji_internal}
                        alt="TTD Penguji Internal"
                        className="max-h-14 max-w-full object-contain"
                      />
                    ) : (
                      <div className="h-14" />
                    )}
                  </div>
                  <p className="font-bold underline">{beritaAcara.penguji_internal || 'Penguji Internal'}</p>
                </div>

                <div>
                  <p className="font-normal">Penguji Eksternal (DU/DI),</p>
                  <div className="h-16 flex items-center justify-center my-1">
                    {beritaAcara.ttd_penguji_eksternal ? (
                      <img
                        src={beritaAcara.ttd_penguji_eksternal}
                        alt="TTD Penguji Eksternal"
                        className="max-h-14 max-w-full object-contain"
                      />
                    ) : (
                      <div className="h-14" />
                    )}
                  </div>
                  <p className="font-bold underline">{beritaAcara.penguji_eksternal || 'Penguji Eksternal'}</p>
                  {beritaAcara.mitra_nama && (
                    <p className="text-[10px] text-slate-600">{beritaAcara.mitra_nama}</p>
                  )}
                </div>
              </div>

              {/* Baris 2: Panitia / Kaprog & Kepala Sekolah */}
              <div className="grid grid-cols-2 gap-8 text-center text-[11.5px] mt-6">
                <div>
                  <p className="font-normal">Ketua Panitia / Kaprog,</p>
                  <div className="h-16 flex items-center justify-center my-1">
                    {beritaAcara.ttd_panitia ? (
                      <img
                        src={beritaAcara.ttd_panitia}
                        alt="TTD Panitia"
                        className="max-h-14 max-w-full object-contain"
                      />
                    ) : (
                      <div className="h-14" />
                    )}
                  </div>
                  <p className="font-bold underline">{beritaAcara.panitia || 'Panitia UKK'}</p>
                </div>

                <div>
                  <p className="font-normal">Mengetahui,</p>
                  <p className="font-normal -mt-0.5">Kepala Sekolah,</p>
                  <div className="h-16 flex items-center justify-center my-1">
                    <div className="h-14" />
                  </div>
                  <p className="font-bold underline">{sekolahData?.kepala_sekolah || 'Kepala Sekolah'}</p>
                  <p className="text-[10px] text-slate-600">NIP. {sekolahData?.nip_kepala || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Page 1 Footer */}
          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between font-sans">
            <span>Berita Acara Pelaksanaan UKK — {beritaAcara.nama_sesi}</span>
            <span>Halaman 1 {hasPhotos ? 'dari 2' : ''}</span>
          </div>
        </div>

            {/* ========================================================================= */}
            {/* LEMBAR 2: LAMPIRAN FOTO DOKUMENTASI VISUAL (JIKA ADA FOTO)                */}
            {/* ========================================================================= */}
            {hasPhotos && (
              <>
                {/* Visual Separator di Layar Desk */}
                <div className="print:hidden flex items-center gap-3 my-1 text-xs text-slate-500 font-sans">
                  <div className="h-px bg-slate-300 dark:bg-slate-700 w-24" />
                  <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3.5 py-1 rounded-full text-[11px] font-semibold tracking-wide shadow-sm border border-slate-300 dark:border-slate-700">
                    Halaman 2: Lampiran Dokumentasi Visual
                  </span>
                  <div className="h-px bg-slate-300 dark:bg-slate-700 w-24" />
                </div>

                <div
                  className="print-sheet w-[794px] min-w-[794px] max-w-[794px] min-h-[1123px] bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-sm font-serif text-[12px] leading-relaxed border border-slate-300 dark:border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    {/* Header Lampiran */}
                    <div className="text-center pb-4 mb-6 border-b border-slate-300">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-black">
                        LAMPIRAN DOKUMENTASI VISUAL PELAKSANAAN UKK
                      </h4>
                      <p className="text-[11px] text-slate-600 font-sans mt-1">
                        Sesi: <strong>{beritaAcara.nama_sesi}</strong> — Ruang: <strong>{beritaAcara.ruang}</strong> ({beritaAcara.tanggal})
                      </p>
                    </div>

                    {/* Grid Foto Dokumentasi (2 Kolom Presisi Sesuai Standar Cetak) */}
                    <div className="grid grid-cols-2 gap-5">
                      {beritaAcara.foto_dokumentasi?.map((fotoItem, fIdx) => {
                        const photoUrl = typeof fotoItem === 'string' ? fotoItem : (fotoItem as any)?.url || '';
                        const photoCaption =
                          typeof fotoItem === 'object' && (fotoItem as any)?.caption && (fotoItem as any).caption.trim()
                            ? (fotoItem as any).caption.trim()
                            : `Foto ${fIdx + 1}: Dokumentasi Pelaksanaan ${beritaAcara.nama_sesi}`;

                        return (
                          <div
                            key={fIdx}
                            className="border border-slate-200 rounded-lg p-2.5 bg-slate-50 flex flex-col items-center"
                          >
                            <div className="w-full h-44 sm:h-48 overflow-hidden rounded bg-white border border-slate-100 flex items-center justify-center">
                              <img
                                src={photoUrl}
                                alt={photoCaption}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <p className="text-[10px] text-slate-700 italic mt-2 text-center font-medium line-clamp-2">
                              {photoCaption}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Page 2 Footer */}
                  <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between font-sans">
                    <span>Lampiran Dokumentasi Visual UKK — {beritaAcara.nama_sesi}</span>
                    <span>Halaman 2 dari 2</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
