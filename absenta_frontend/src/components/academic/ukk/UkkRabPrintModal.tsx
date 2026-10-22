import React, { useState, useEffect, useRef } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui';
import {
  generatePdfUkkRab,
  formatRupiah,
  type UkkRabData,
  type UkkRabPrintData,
} from '@/utils/print/modules/pdfUkkRab';
import { useUkkStrukturSigners } from './useUkkStrukturSigners';
import { ShieldCheck, ChevronDown, ChevronUp, UserCheck, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export interface UkkRabPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  rabData: UkkRabData | null;
  jurusanNama?: string;
  tahunPelajaran?: string;
  kaprogNama?: string;
  kaprogNip?: string;
  wakasekSarprasNama?: string;
  wakasekSarprasNip?: string;
}

export const UkkRabPrintModal: React.FC<UkkRabPrintModalProps> = ({
  isOpen,
  onClose,
  rabData,
  jurusanNama = 'Kejuruan',
  tahunPelajaran,
  kaprogNama: propKaprogNama,
  kaprogNip: propKaprogNip,
  wakasekSarprasNama: propSarprasNama,
  wakasekSarprasNip: propSarprasNip,
}) => {
  // Toggle Logos state (Kop Surat)
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);

  // Hook Resolving Active Organizational Structure
  const autoSigners = useUkkStrukturSigners(rabData?.jurusanId, jurusanNama);
  const printSheetRef = useRef<HTMLDivElement | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Editable Signers State (Prefilled from Struktur Organisasi)
  const [kaprogNama, setKaprogNama] = useState<string>('');
  const [kaprogNip, setKaprogNip] = useState<string>('');
  const [wakasekSarprasNama, setWakasekSarprasNama] = useState<string>('');
  const [wakasekSarprasNip, setWakasekSarprasNip] = useState<string>('');
  const [kepalaSekolahNama, setKepalaSekolahNama] = useState<string>('');
  const [kepalaSekolahNip, setKepalaSekolahNip] = useState<string>('');
  const [showSignerConfig, setShowSignerConfig] = useState<boolean>(false);

  // Universal Hook: Resolves active Tenant & Sekolah data, plus pre-converts logos to Base64
  const { tenantInfo, logoDaerahBase64, logoSekolahBase64, rawSekolah } = usePrintHeaderData();
  const sekolahData = rawSekolah;

  // Initialize and synchronize with autoSigners
  useEffect(() => {
    if (autoSigners) {
      setKaprogNama(propKaprogNama || autoSigners.kaprog.nama);
      setKaprogNip(propKaprogNip || autoSigners.kaprog.nip);
      setWakasekSarprasNama(propSarprasNama || autoSigners.wakasekSarpras.nama);
      setWakasekSarprasNip(propSarprasNip || autoSigners.wakasekSarpras.nip);
      setKepalaSekolahNama(autoSigners.kepsek.nama || (rawSekolah as any)?.kepala_sekolah || 'Kepala Sekolah');
      setKepalaSekolahNip(autoSigners.kepsek.nip || (rawSekolah as any)?.nip_kepala || '-');
    }
  }, [autoSigners, propKaprogNama, propKaprogNip, propSarprasNama, propSarprasNip, rawSekolah]);

  const handleResetToStruktur = () => {
    setKaprogNama(autoSigners.kaprog.nama);
    setKaprogNip(autoSigners.kaprog.nip);
    setWakasekSarprasNama(autoSigners.wakasekSarpras.nama);
    setWakasekSarprasNip(autoSigners.wakasekSarpras.nip);
    setKepalaSekolahNama(autoSigners.kepsek.nama || (rawSekolah as any)?.kepala_sekolah || 'Kepala Sekolah');
    setKepalaSekolahNip(autoSigners.kepsek.nip || (rawSekolah as any)?.nip_kepala || '-');
    toast.success('Penandatangan disinkronkan kembali dari Struktur Organisasi');
  };

  if (!rabData) return null;

  const alatList = (rabData.items || []).filter((i) => i.kategori === 'ALAT');
  const bahanList = (rabData.items || []).filter((i) => i.kategori === 'BAHAN');

  const totalAlat = alatList.reduce((acc, curr) => acc + (curr.total_harga || 0), 0);
  const totalBahan = bahanList.reduce((acc, curr) => acc + (curr.total_harga || 0), 0);
  const grandTotal = totalAlat + totalBahan;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    // 1. Prioritas Utama: Export Canvas Presisi 100% Sesuai Tampilan Layar (WYSIWYG)
    try {
      const sheetElement = (printSheetRef.current?.querySelector('.print-sheet') as HTMLElement) || printSheetRef.current;
      if (sheetElement) {
        toast.loading('Menyiapkan dokumen PDF presisi...', { id: 'pdf-rab-export' });
        const html2canvas = (await import('html2canvas-pro')).default;
        const { jsPDF } = await import('jspdf');

        const canvas = await html2canvas(sheetElement, {
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
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
        const filename = `RAB_UKK_${(rabData.jurusanNama || jurusanNama).replace(/\s+/g, '_')}_TA_${(tahunPelajaran || 'TA').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        pdf.save(filename);
        toast.success('Dokumen PDF berhasil diunduh (Presisi 100% Layar)', { id: 'pdf-rab-export' });
        setIsExportingPdf(false);
        return;
      }
    } catch (err) {
      console.warn('Canvas export fallback to jsPDF programmatic:', err);
    }

    // 2. Fallback: Programmatic Vector Generator
    try {
      const payload: UkkRabPrintData = {
        sekolah: {
          nama: tenantInfo.name || 'SEKOLAH MENENGAH KEJURUAN',
          alamat: tenantInfo.address || '',
          kota: (rawSekolah as any)?.kota || 'Purwakarta',
          telepon: tenantInfo.phone,
          email: tenantInfo.email,
          website: tenantInfo.website,
          kepala_sekolah: kepalaSekolahNama || (rawSekolah as any)?.kepala_sekolah || 'Kepala Sekolah',
          nip_kepala: kepalaSekolahNip || (rawSekolah as any)?.nip_kepala || '-',
          nama_dinas_atas: tenantInfo.nama_dinas_atas,
          nama_dinas_bawah: tenantInfo.nama_dinas_bawah,
          nama_cabang_dinas: tenantInfo.nama_cabang_dinas,
          print_header_lines: tenantInfo.print_header_lines,
        },
        options: {
          logoDaerahBase64: showLogoDaerah ? logoDaerahBase64 : null,
          logoSekolahBase64: showLogoSekolah ? logoSekolahBase64 : null,
        },
        kaprog: {
          nama: kaprogNama || 'Ketua Program Keahlian',
          nip: kaprogNip || '-',
        },
        wakasekSarpras: {
          nama: wakasekSarprasNama || 'Wakasek Bidang Sarpras',
          nip: wakasekSarprasNip || '-',
        },
        rab: rabData,
      };

      const { blobUrl } = generatePdfUkkRab(payload);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `RAB_UKK_${(rabData.jurusanNama || jurusanNama).replace(/\s+/g, '_')}_TA_${(tahunPelajaran || 'TA').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Dokumen PDF berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh dokumen PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DISETUJUI_SARPRAS':
        return <span className="text-emerald-700 font-bold">Disetujui Sarpras</span>;
      case 'DIAJUKAN_KE_SARPRAS':
        return <span className="text-blue-700 font-bold">Menunggu Verifikasi Sarpras</span>;
      case 'DITOLAK_SARPRAS':
        return <span className="text-rose-700 font-bold">Perlu Revisi Sarpras</span>;
      default:
        return <span className="text-slate-600 font-semibold">Draf Pengajuan</span>;
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pratinjau Cetak RAB & Kebutuhan Alat-Bahan UKK"
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Program Keahlian:</span>
          <span className="text-xs font-bold text-foreground bg-primary/10 text-primary px-2.5 py-1 rounded-md">
            {jurusanNama}
          </span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            • TA {tahunPelajaran || 'Aktif'} • Standar A4 Portrait (210 × 297 mm)
          </span>
        </div>
      }
      orientation="portrait"
      allowOrientationToggle={false}
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText="PDF"
      printButtonText="Cetak"
      size="5xl"
    >
      {/* ========================================================================= */}
      {/* PENGATURAN PENANDATANGAN TERHUBUNG STRUKTUR ORGANISASI (PRINT HIDDEN)      */}
      {/* ========================================================================= */}
      <div className="print:hidden mb-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Penandatangan Terhubung Struktur Organisasi
            </span>
            {autoSigners.kaprog.isAssigned && autoSigners.wakasekSarpras.isAssigned && (
              <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                100% Terpetakan
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToStruktur}
              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 inline-flex items-center gap-1 cursor-pointer"
              title="Reset ke data awal struktur organisasi"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Struktur
            </button>
            <button
              type="button"
              onClick={() => setShowSignerConfig(!showSignerConfig)}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer p-1"
            >
              {showSignerConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Info ringkas saat ditutup */}
        {!showSignerConfig && (
          <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <strong>Kaprog:</strong> {kaprogNama} {kaprogNip !== '-' && `(${kaprogNip})`}
            </span>
            <span>
              <strong>Waka Sarpras:</strong> {wakasekSarprasNama} {wakasekSarprasNip !== '-' && `(${wakasekSarprasNip})`}
            </span>
            <span>
              <strong>Kepsek:</strong> {kepalaSekolahNama}
            </span>
          </div>
        )}

        {/* Form input saat dibuka */}
        {showSignerConfig && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Kaprog */}
            <div className="space-y-1.5 p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                <span>Ketua Program Keahlian (Kaprog)</span>
                {autoSigners.kaprog.isAssigned && (
                  <span className="text-[10px] text-emerald-600">Terhubung</span>
                )}
              </div>
              <input
                type="text"
                placeholder="Nama Kaprog"
                value={kaprogNama}
                onChange={(e) => setKaprogNama(e.target.value)}
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200"
              />
              <input
                type="text"
                placeholder="NIP Kaprog (atau -)"
                value={kaprogNip}
                onChange={(e) => setKaprogNip(e.target.value)}
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Wakasek Sarpras */}
            <div className="space-y-1.5 p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                <span>Wakasek Bidang Sarpras</span>
                {autoSigners.wakasekSarpras.isAssigned && (
                  <span className="text-[10px] text-emerald-600">Terhubung</span>
                )}
              </div>
              <input
                type="text"
                placeholder="Nama Wakasek Sarpras"
                value={wakasekSarprasNama}
                onChange={(e) => setWakasekSarprasNama(e.target.value)}
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200"
              />
              <input
                type="text"
                placeholder="NIP Wakasek (atau -)"
                value={wakasekSarprasNip}
                onChange={(e) => setWakasekSarprasNip(e.target.value)}
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Kepala Sekolah */}
            <div className="space-y-1.5 p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                <span>Kepala Sekolah</span>
                <span className="text-[10px] text-emerald-600">Profil Sekolah</span>
              </div>
              <input
                type="text"
                placeholder="Nama Kepala Sekolah"
                value={kepalaSekolahNama}
                onChange={(e) => setKepalaSekolahNama(e.target.value)}
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200"
              />
              <input
                type="text"
                placeholder="NIP Kepala Sekolah"
                value={kepalaSekolahNip}
                onChange={(e) => setKepalaSekolahNip(e.target.value)}
                className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* LEMBAR NASKAH UTAMA RAB & DAFTAR KEBUTUHAN ALAT/BAHAN (A4 PORTRAIT)        */}
      {/* ========================================================================= */}
      <div ref={printSheetRef} className="w-full flex flex-col items-center">
        <PrintDocumentSheet
          orientation="portrait"
          pageNumber={1}
          totalPages={1}
          footerText={`Rencana Anggaran Biaya UKK — ${jurusanNama} (${tahunPelajaran || '-'})`}
        >
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
            RENCANA ANGGARAN BIAYA (RAB) & DAFTAR KEBUTUHAN ALAT/BAHAN
          </h3>
          <h3 className="text-sm font-bold uppercase tracking-wider text-black">
            UJI KOMPETENSI KEAHLIAN (UKK)
          </h3>
          <p className="text-[11px] font-normal italic text-slate-700">
            Tahun Pelajaran {tahunPelajaran || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`}
          </p>
        </div>

        {/* Ringkasan Metadata Pengajuan */}
        <table className="w-full my-3 text-[11px] border-collapse">
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="w-36 py-1 align-top font-semibold text-slate-700">Program Keahlian</td>
              <td className="py-1 align-top font-bold text-slate-900">: {jurusanNama}</td>
              <td className="w-36 py-1 align-top font-semibold text-slate-700">Jumlah Peserta</td>
              <td className="py-1 align-top font-bold text-slate-900">: {rabData.jumlahPeserta || 0} Siswa</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-1 align-top font-semibold text-slate-700">Judul Penugasan UKK</td>
              <td className="py-1 align-top text-slate-900" colSpan={3}>
                : {rabData.judulPenugasan || `Praktik Kejuruan ${jurusanNama}`}
              </td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-1 align-top font-semibold text-slate-700">Tanggal Pengajuan</td>
              <td className="py-1 align-top text-slate-900">: {rabData.tanggalPengajuan || '-'}</td>
              <td className="py-1 align-top font-semibold text-slate-700">Status Verifikasi</td>
              <td className="py-1 align-top">: {getStatusBadge(rabData.statusPengajuan)}</td>
            </tr>
          </tbody>
        </table>

        {/* TABEL A: KEBUTUHAN ALAT PRAKTIK */}
        <div className="mt-4 mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-black mb-1.5 flex items-center justify-between">
            <span>A. Kebutuhan Peralatan / Fasilitas Ujian</span>
            <span className="text-[10px] font-semibold text-slate-600">Subtotal: {formatRupiah(totalAlat)}</span>
          </h4>
          <table className="w-full text-[10px] border border-black border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-black text-center font-bold">
                <th className="border-r border-black p-1.5 w-7">No</th>
                <th className="border-r border-black p-1.5 text-left">Nama Alat / Perangkat</th>
                <th className="border-r border-black p-1.5 text-left">Spesifikasi / Standar</th>
                <th className="border-r border-black p-1.5 w-16">Kebutuhan</th>
                <th className="border-r border-black p-1.5 w-24">Ketersediaan Lab</th>
                <th className="border-r border-black p-1.5 text-right w-24">Estimasi Harga</th>
                <th className="p-1.5 text-right w-24">Total Biaya</th>
              </tr>
            </thead>
            <tbody>
              {alatList.length > 0 ? (
                alatList.map((item, idx) => (
                  <tr key={item.id || idx} className="border-b border-slate-300">
                    <td className="border-r border-black p-1 text-center font-medium">{idx + 1}</td>
                    <td className="border-r border-black p-1 font-semibold text-black">{item.nama_barang}</td>
                    <td className="border-r border-black p-1 text-slate-600">{item.spesifikasi || '-'}</td>
                    <td className="border-r border-black p-1 text-center">
                      {item.jumlah_total} {item.satuan}
                    </td>
                    <td className="border-r border-black p-1 text-center">
                      {item.status_ketersediaan === 'TERSEDIA' ? (
                        <span className="text-emerald-700 font-medium">Tersedia</span>
                      ) : item.status_ketersediaan === 'PINJAM' ? (
                        <span className="text-blue-700 font-medium">Pinjam Mitra</span>
                      ) : (
                        <span className="text-amber-800 font-bold">Pengadaan</span>
                      )}
                    </td>
                    <td className="border-r border-black p-1 text-right">{formatRupiah(item.harga_satuan)}</td>
                    <td className="p-1 text-right font-medium">{formatRupiah(item.total_harga)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-2 text-center text-slate-500 italic">
                    Tidak ada pengajuan peralatan baru (peralatan lab telah memadai).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* TABEL B: BAHAN HABIS PAKAI (BHP) */}
        <div className="mt-4 mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-black mb-1.5 flex items-center justify-between">
            <span>B. Kebutuhan Bahan Praktik Habis Pakai (BHP)</span>
            <span className="text-[10px] font-semibold text-slate-600">Subtotal: {formatRupiah(totalBahan)}</span>
          </h4>
          <table className="w-full text-[10px] border border-black border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-black text-center font-bold">
                <th className="border-r border-black p-1.5 w-7">No</th>
                <th className="border-r border-black p-1.5 text-left">Nama Bahan Habis Pakai</th>
                <th className="border-r border-black p-1.5 text-left">Spesifikasi</th>
                <th className="border-r border-black p-1.5 w-20">Rasio /Siswa</th>
                <th className="border-r border-black p-1.5 w-20">Total Vol</th>
                <th className="border-r border-black p-1.5 text-right w-24">Harga Satuan</th>
                <th className="p-1.5 text-right w-24">Total Biaya</th>
              </tr>
            </thead>
            <tbody>
              {bahanList.length > 0 ? (
                bahanList.map((item, idx) => (
                  <tr key={item.id || idx} className="border-b border-slate-300">
                    <td className="border-r border-black p-1 text-center font-medium">{idx + 1}</td>
                    <td className="border-r border-black p-1 font-semibold text-black">{item.nama_barang}</td>
                    <td className="border-r border-black p-1 text-slate-600">{item.spesifikasi || '-'}</td>
                    <td className="border-r border-black p-1 text-center">
                      {item.rasio_per_siswa ? `${item.rasio_per_siswa} ${item.satuan}` : '-'}
                    </td>
                    <td className="border-r border-black p-1 text-center font-semibold">
                      {item.jumlah_total} {item.satuan}
                    </td>
                    <td className="border-r border-black p-1 text-right">{formatRupiah(item.harga_satuan)}</td>
                    <td className="p-1 text-right font-medium">{formatRupiah(item.total_harga)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-2 text-center text-slate-500 italic">
                    Tidak ada bahan praktik yang diajukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* TOTAL REKAPITULASI BIAYA */}
        <div className="mt-3 p-2 bg-slate-50 border border-slate-300 rounded flex items-center justify-between text-xs">
          <span className="font-bold text-black uppercase tracking-wider">
            Total Rekapitulasi Anggaran Kebutuhan UKK
          </span>
          <span className="font-extrabold text-sm text-black">{formatRupiah(grandTotal)}</span>
        </div>

        {/* Catatan Tambahan Jika Ada */}
        {rabData.catatanPengantar && (
          <div className="mt-3 text-[10px] text-slate-700 bg-slate-50/80 p-2 border border-slate-200 rounded">
            <strong>Catatan Pengantar Kaprog:</strong> {rabData.catatanPengantar}
          </div>
        )}

        {/* Tanda Tangan: Baris 1 Sejajar (Wakasek Sarpras Kiri, Kaprog Kanan), Baris 2 Kepala Sekolah di Tengah Bawah */}
        <div className="mt-8 pt-2">
          {/* Baris 1: Wakasek Sarpras (Kiri) & Kaprog (Kanan) */}
          <div className="grid grid-cols-2 gap-8 text-center text-[10.5px]">
            {/* Kolom Kiri: Verifikator (Wakasek Sarpras) */}
            <div>
              <p className="font-normal text-slate-800">Diverifikasi oleh,</p>
              <p className="font-semibold text-black -mt-0.5">Wakasek Bidang Sarpras</p>
              <div className="h-16 flex items-center justify-center my-1" />
              <p className="font-bold underline text-black">{wakasekSarprasNama}</p>
              <p className="text-[9.5px] text-slate-600">NIP. {wakasekSarprasNip}</p>
            </div>

            {/* Kolom Kanan: Pemohon (Kaprog) */}
            <div>
              <div className="text-[10.5px] text-black mb-1">
                {sekolahData?.kota || 'Purwakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <p className="font-normal text-slate-800">Dibuat oleh,</p>
              <p className="font-semibold text-black -mt-0.5">Ketua Program Keahlian</p>
              <div className="h-14 flex items-center justify-center my-1" />
              <p className="font-bold underline text-black">{kaprogNama}</p>
              <p className="text-[9.5px] text-slate-600">NIP. {kaprogNip}</p>
            </div>
          </div>

          {/* Baris 2: Mengetahui / Menyetujui Kepala Sekolah (Di Tengah Bawah) */}
          <div className="mt-6 flex justify-center text-center text-[10.5px]">
            <div className="w-72">
              <p className="font-normal text-slate-800">Mengetahui / Menyetujui,</p>
              <p className="font-semibold text-black -mt-0.5">Kepala Sekolah</p>
              <div className="h-16 flex items-center justify-center my-1" />
              <p className="font-bold underline text-black">
                {kepalaSekolahNama || sekolahData?.kepala_sekolah || 'Kepala Sekolah'}
              </p>
              <p className="text-[9.5px] text-slate-600">
                NIP. {kepalaSekolahNip || sekolahData?.nip_kepala || '-'}
              </p>
            </div>
          </div>
        </div>
      </PrintDocumentSheet>
      </div>
    </UniversalDocumentModal>
  );
};
