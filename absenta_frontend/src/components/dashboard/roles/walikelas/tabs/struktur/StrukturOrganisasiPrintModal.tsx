import React, { useState } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import { PrintSignature } from '@/components/ui/PrintSignature';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import type { PengurusPosition } from './strukturTypes';
import type { Siswa } from '@/types/academic';

export interface StrukturOrganisasiPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  kelasNama?: string;
  waliKelasNama?: string;
  waliKelasNip?: string;
  tahunPelajaran?: string;
  positions: PengurusPosition[];
  studentsList?: Siswa[];
}

export const StrukturOrganisasiPrintModal: React.FC<StrukturOrganisasiPrintModalProps> = ({
  isOpen,
  onClose,
  kelasNama = 'Kelas',
  waliKelasNama = 'Wali Kelas',
  waliKelasNip,
  tahunPelajaran,
  positions,
  studentsList = [],
}) => {
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Hook SSOT Kop Surat Dinas & Sekolah
  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const kepalaSekolahNama = (rawSekolah as any)?.kepala_sekolah || (rawSekolah as any)?.nama_kepala_sekolah || 'Kepala Sekolah';
  const nipKepalaSekolah = (rawSekolah as any)?.nip_kepala || (rawSekolah as any)?.nip_kepala_sekolah || '-';
  const kotaSekolah = (rawSekolah as any)?.kota || (rawSekolah as any)?.kabupaten || 'Purwakarta';

  if (!isOpen) return null;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Sedang merender PDF Struktur Organisasi...');
    try {
      const sheetElement = document.querySelector('.print-sheet') as HTMLElement;
      if (!sheetElement) {
        window.print();
        toast.dismiss(toastId);
        return;
      }

      const canvas = await html2canvas(sheetElement, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`Struktur_Organisasi_${kelasNama.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF Struktur Organisasi berhasil diunduh!', { id: toastId });
    } catch (err) {
      console.error('[PDF Export Error]', err);
      toast.error('Gagal mengekspor canvas, membuka dialog cetak browser...', { id: toastId });
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  // Getters jabatan
  const km = positions.find((p) => p.id === 'km');
  const wkm = positions.find((p) => p.id === 'wkm');
  const sekretaris = positions.find((p) => p.id === 'sekretaris');
  const bendahara = positions.find((p) => p.id === 'bendahara');
  const seksiList = positions.filter((p) => p.category === 'SEKSI');

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cetak Struktur Organisasi — ${kelasNama}`}
      subtitle="Dokumen resmi bagan kepengurusan rombel peserta didik"
      orientation="portrait"
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      allowLogoToggles={true}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExporting ? 'Memproses...' : 'Unduh PDF'}
      printButtonText="Cetak Dokumen"
      size="5xl"
    >
      <PrintDocumentSheet
        orientation="portrait"
        pageNumber={1}
        totalPages={1}
        footerText={`Struktur Organisasi Kelas — ${kelasNama} — TP. ${tahunPelajaran || '2025/2026'}`}
      >
        {/* KOP SURAT RESMI */}
        <PrintHeader
          variant="portrait"
          tenantInfo={tenantInfo}
          showLogoDaerah={showLogoDaerah}
          showLogoSekolah={showLogoSekolah}
        />

        {/* JUDUL DOKUMEN */}
        <div className="text-center my-3 space-y-0.5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-black">
            STRUKTUR ORGANISASI KELAS
          </h3>
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">
            ROMBEL {kelasNama.toUpperCase()}
          </h4>
          <p className="text-[10px] italic text-slate-600">
            Tahun Pelajaran {tahunPelajaran || '2025/2026'}
          </p>
        </div>

        {/* TABEL INFORMASI KELAS */}
        <div className="border border-black/80 rounded-sm p-2 my-2.5 bg-slate-50/50 text-[10.5px]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <div>
              <span className="font-semibold text-slate-600">Nama Rombel: </span>
              <span className="font-bold text-black">{kelasNama}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-600">Wali Kelas: </span>
              <span className="font-bold text-black">{waliKelasNama}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-600">Total Siswa Terdaftar: </span>
              <span className="font-bold text-black">{studentsList.length || '-'} Siswa</span>
            </div>
            <div>
              <span className="font-semibold text-slate-600">NIP Wali Kelas: </span>
              <span className="font-mono text-black">{waliKelasNip || '-'}</span>
            </div>
          </div>
        </div>

        {/* ── BAGAN POHON VERSI CETAK RESMI (HIGH-CONTRAST MONOCHROME/CLEAN INK) ── */}
        <div className="my-3 py-1 flex flex-col items-center">
          {/* LEVEL 1: WALI KELAS */}
          <div className="w-64 border-2 border-black rounded-lg p-2 text-center bg-slate-100/90 shadow-2xs">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-700 block">
              Pembina Rombel (Wali Kelas)
            </span>
            <p className="text-[11.5px] font-black text-black uppercase mt-0.5">
              {waliKelasNama}
            </p>
            {waliKelasNip && (
              <p className="text-[9px] text-slate-600 font-mono">
                NIP. {waliKelasNip}
              </p>
            )}
          </div>
          <div className="w-0.5 h-3 bg-black mx-auto" />

          {/* LEVEL 2: KETUA MURID */}
          <div className="w-64 border-2 border-black rounded-lg p-2 text-center bg-white shadow-2xs">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-700 block">
              Ketua Murid (KM)
            </span>
            <p className="text-[11.5px] font-black text-black mt-0.5">
              {km?.assignedStudentNames[0] || '(Belum Ditentukan)'}
            </p>
          </div>
          <div className="w-0.5 h-3 bg-black mx-auto" />

          {/* LEVEL 3: WAKIL KETUA MURID */}
          <div className="w-64 border border-black rounded-lg p-1.5 text-center bg-white shadow-2xs">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 block">
              Wakil Ketua Murid
            </span>
            <p className="text-[11px] font-bold text-black mt-0.5">
              {wkm?.assignedStudentNames[0] || '(Belum Ditentukan)'}
            </p>
          </div>
          <div className="w-0.5 h-3 bg-black mx-auto" />

          {/* LEVEL 4: BRANCHING TO SEKRETARIS & BENDAHARA */}
          <div className="w-full max-w-[480px] relative">
            <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-black" />
            <div className="grid grid-cols-2 gap-6 pt-3 relative">
              <div className="absolute top-0 left-1/4 -translate-x-1/2 w-0.5 h-3 bg-black" />
              <div className="absolute top-0 right-1/4 translate-x-1/2 w-0.5 h-3 bg-black" />

              {/* SEKRETARIS */}
              <div className="border border-black rounded-lg p-2 text-center bg-slate-50">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-800 block border-b border-black/40 pb-0.5 mb-1">
                  Sekretaris
                </span>
                <div className="text-[10px] space-y-0.5 text-black font-semibold">
                  {sekretaris?.assignedStudentNames.map((name, i) => (
                    <p key={i}>
                      {i + 1}. {name}
                    </p>
                  ))}
                </div>
              </div>

              {/* BENDAHARA */}
              <div className="border border-black rounded-lg p-2 text-center bg-slate-50">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-800 block border-b border-black/40 pb-0.5 mb-1">
                  Bendahara
                </span>
                <div className="text-[10px] space-y-0.5 text-black font-semibold">
                  {bendahara?.assignedStudentNames.map((name, i) => (
                    <p key={i}>
                      {i + 1}. {name}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div className="w-0.5 h-3 bg-black mx-auto" />
          </div>

          {/* LEVEL 5: SEKSI-SEKSI BIDANG */}
          <div className="w-full max-w-[560px] pt-1">
            <div className="grid grid-cols-4 gap-2">
              {seksiList.map((seksi) => (
                <div
                  key={seksi.id}
                  className="border border-black rounded-lg p-1.5 text-center bg-white"
                >
                  <span className="text-[8.5px] font-bold uppercase text-slate-600 block border-b border-slate-300 pb-0.5 mb-0.5">
                    {seksi.roleTitle}
                  </span>
                  <p className="text-[9.5px] font-bold text-black truncate mt-1">
                    {seksi.assignedStudentNames[0] || '-'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── TANDA TANGAN RESMI 2-TIER (Kemenag/Kemdikbud Standard) ── */}
        <div className="mt-8 pt-2">
          {/* Tier 1: Wali Kelas (Kanan) & Ketua Murid (Kiri) */}
          <div className="flex justify-between items-start text-center">
            <div className="w-56 font-serif">
              <p className="text-[11px] mb-1">Mengetahui,</p>
              <p className="text-[11px] font-bold mb-16">Ketua Murid (KM)</p>
              <p className="text-[11.5px] font-bold underline uppercase">
                {km?.assignedStudentNames[0] || '........................................'}
              </p>
              <p className="text-[10px] text-slate-600">Perwakilan Siswa</p>
            </div>

            <div className="w-56 font-serif">
              <p className="text-[11px] mb-1">
                {kotaSekolah}, {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-[11px] font-bold mb-16">Wali Kelas {kelasNama}</p>
              <p className="text-[11.5px] font-bold underline uppercase">
                {waliKelasNama}
              </p>
              <p className="text-[10px] text-slate-700 font-mono">
                {waliKelasNip ? `NIP. ${waliKelasNip}` : 'NIP. ........................................'}
              </p>
            </div>
          </div>

          {/* Tier 2: Kepala Sekolah (Tengah Bawah) */}
          <div className="flex justify-center mt-6 text-center">
            <div className="w-64 font-serif">
              <p className="text-[11px] mb-1">Mengesahkan,</p>
              <p className="text-[11px] font-bold mb-16">Kepala Sekolah</p>
              <p className="text-[11.5px] font-bold underline uppercase">
                {kepalaSekolahNama}
              </p>
              <p className="text-[10px] text-slate-700 font-mono">
                {nipKepalaSekolah ? `NIP. ${nipKepalaSekolah}` : 'NIP. ........................................'}
              </p>
            </div>
          </div>
        </div>
      </PrintDocumentSheet>
    </UniversalDocumentModal>
  );
};

StrukturOrganisasiPrintModal.displayName = 'StrukturOrganisasiPrintModal';
