import React, { useState, useMemo, useRef } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  UniversalDocumentSignatures,
  PrintHeader,
  usePrintHeaderData,
  type DocumentTemplateOption,
} from '@/components/ui/PrintHeader';
import { useDocumentSigners } from '@/hooks/useDocumentSigners';
import { useTahunPelajaranOptions } from '@/hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '@/hooks/useSemesterOptions';
import { getAssignmentFlagsForPosition } from '@/config/assignmentFlags';
import { Crown, Printer, Download, Sparkles, LayoutTemplate, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { TopologyNodeData } from './types';

export interface StrukturDivisiPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  divisionCode: string;
  divisionTitle?: string;
  treeData?: TopologyNodeData | null;
}

const TEMPLATE_OPTIONS: DocumentTemplateOption[] = [
  {
    id: 'a4_landscape',
    label: 'A4 Landscape (Format Berkas Administrasi)',
    description: 'Ukuran kertas standar dokumen resmi dinas (297 × 210 mm).',
    badge: 'A4',
  },
  {
    id: 'grc_board',
    label: 'Papan Tulis / Papan Dinding GRC (Format Banner 2:1)',
    description: 'Ukuran papan dinding sekolah (rasio 2:1 / 240 × 120 cm).',
    badge: 'Banner GRC',
  },
];

const DIVISION_THEMES: Record<string, {
  name: string;
  roleTitle: string;
  headerBg: string;
  borderColor: string;
  textColor: string;
  accentBadge: string;
}> = {
  KURIKULUM: {
    name: 'BIDANG KURIKULUM',
    roleTitle: 'Waka Bidang Kurikulum',
    headerBg: 'bg-emerald-700 text-white',
    borderColor: 'border-emerald-600',
    textColor: 'text-emerald-800 dark:text-emerald-300',
    accentBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  KESISWAAN: {
    name: 'BIDANG KESISWAAN',
    roleTitle: 'Waka Bidang Kesiswaan',
    headerBg: 'bg-amber-600 text-white',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-800 dark:text-amber-300',
    accentBadge: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  HUBIN: {
    name: 'BIDANG HUBUNGAN INDUSTRI & MASYARAKAT (HUBIN)',
    roleTitle: 'Waka Bidang Hubin',
    headerBg: 'bg-cyan-700 text-white',
    borderColor: 'border-cyan-600',
    textColor: 'text-cyan-800 dark:text-cyan-300',
    accentBadge: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  },
  SARPRAS: {
    name: 'BIDANG SARANA & PRASARANA (SARPRAS)',
    roleTitle: 'Waka Bidang Sarpras',
    headerBg: 'bg-indigo-700 text-white',
    borderColor: 'border-indigo-600',
    textColor: 'text-indigo-800 dark:text-indigo-300',
    accentBadge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
  TU_KEPALA: {
    name: 'TATA USAHA (TU)',
    roleTitle: 'Kepala Tata Usaha',
    headerBg: 'bg-blue-700 text-white',
    borderColor: 'border-blue-600',
    textColor: 'text-blue-800 dark:text-blue-300',
    accentBadge: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  BKK: {
    name: 'BURSA KERJA KHUSUS (BKK)',
    roleTitle: 'Ketua / Koordinator BKK',
    headerBg: 'bg-violet-700 text-white',
    borderColor: 'border-violet-600',
    textColor: 'text-violet-800 dark:text-violet-300',
    accentBadge: 'bg-violet-100 text-violet-800 border-violet-300',
  },
  BPBK: {
    name: 'BIMBINGAN & KONSELING (BP/BK)',
    roleTitle: 'Koordinator Guru BP/BK',
    headerBg: 'bg-rose-700 text-white',
    borderColor: 'border-rose-600',
    textColor: 'text-rose-800 dark:text-rose-300',
    accentBadge: 'bg-rose-100 text-rose-800 border-rose-300',
  },
};

export const StrukturDivisiPrintModal: React.FC<StrukturDivisiPrintModalProps> = ({
  isOpen,
  onClose,
  divisionCode,
  divisionTitle,
  treeData,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('a4_landscape');
  const [showLogoDaerah, setShowLogoDaerah] = useState<boolean>(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // 1. Data Hooks
  const { tenantInfo } = usePrintHeaderData();
  const signers = useDocumentSigners();
  const { activeYear } = useTahunPelajaranOptions();
  const { activeSemester } = useSemesterOptions();

  const theme = DIVISION_THEMES[divisionCode] || {
    name: `BIDANG ${divisionCode}`,
    roleTitle: `Koordinator ${divisionCode}`,
    headerBg: 'bg-slate-800 text-white',
    borderColor: 'border-slate-700',
    textColor: 'text-slate-800',
    accentBadge: 'bg-slate-100 text-slate-800 border-slate-300',
  };

  const effectiveTitle = divisionTitle || theme.name;
  const tpNama = activeYear?.tahun || '2026/2027';
  const semNama = activeSemester?.nama || 'Ganjil';

  // 2. Extract Leader & Sub-Bidangs from treeData
  const { leaderNode, subNodes } = useMemo(() => {
    if (!treeData) return { leaderNode: null, subNodes: [] };

    let leader: TopologyNodeData | null = null;
    let subs: TopologyNodeData[] = [];

    // Jika root adalah CATEGORY (BIDANG KESISWAAN):
    if (treeData.type === 'CATEGORY' && treeData.children && treeData.children.length > 0) {
      // Child pertama adalah Leader
      leader = treeData.children[0];
      // Anak dari leader adalah sub-bidang (horizontal tree)
      if (leader.children && leader.children.length > 0) {
        subs = leader.children.filter((c) => !c.id?.startsWith('add-new-'));
      } else if (treeData.children.length > 1) {
        // Fallback jika flat: children index 1..N adalah sub-bidang
        subs = treeData.children.slice(1).filter((c) => !c.id?.startsWith('add-new-'));
      }
    } else if (treeData.type === 'STRUCT') {
      leader = treeData;
      subs = (treeData.children || []).filter((c) => !c.id?.startsWith('add-new-'));
    }

    return { leaderNode: leader, subNodes: subs };
  }, [treeData]);

  // Resolve leader person info for signatures
  const leaderPerson = useMemo(() => {
    return {
      roleTitle: theme.roleTitle,
      personName: leaderNode?.subLabel && leaderNode.subLabel !== 'Belum Diisi' && leaderNode.subLabel !== '—' 
        ? leaderNode.subLabel 
        : '............................................',
      nip: (leaderNode?.data as any)?.nip || '',
    };
  }, [leaderNode, theme.roleTitle]);

  // Today string for titimangsa
  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // 3. Dual-Engine PDF Download Handler (html2canvas-pro + jsPDF True WYSIWYG)
  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      toast.loading('Menyiapkan dokumen PDF...', { id: 'pdf-toast' });

      const sheetElement = document.querySelector('.print-sheet') as HTMLElement;
      if (!sheetElement) {
        toast.error('Lembar dokumen tidak ditemukan', { id: 'pdf-toast' });
        setIsExporting(false);
        return;
      }

      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const isGrc = selectedTemplate === 'grc_board';

      const canvas = await html2canvas(sheetElement, {
        scale: isGrc ? 1.6 : 2.0, // Optimal resolution & RAM safety
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const sheets = clonedDoc.querySelectorAll('.print-sheet');
          sheets.forEach((s: any) => {
            s.style.border = 'none';
            s.style.boxShadow = 'none';
            s.style.outline = 'none';
          });
        },
      });

      // Anti-Bloat Guard: Gunakan image/jpeg 0.88 (< 1MB)
      const imgData = canvas.toDataURL('image/jpeg', 0.88);
      const canvasRatio = canvas.height / canvas.width;

      if (isGrc) {
        // GRC Board Rasio 2:1 (420 × 210 mm)
        const pdfWidth = 420;
        const pdfHeight = 210;
        const imgHeight = pdfWidth * canvasRatio;

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [420, 210],
          compress: true,
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
        pdf.save(`Bagan_Papan_GRC_${divisionCode}_${tpNama.replace('/', '-')}.pdf`);
      } else {
        // A4 Landscape (297 × 210 mm)
        const pdfWidth = 297;
        const pdfHeight = 210;
        const imgHeight = pdfWidth * canvasRatio;

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
          compress: true,
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
        pdf.save(`Struktur_Organisasi_${divisionCode}_${tpNama.replace('/', '-')}.pdf`);
      }

      toast.success('Dokumen PDF berhasil diunduh', { id: 'pdf-toast' });
    } catch (err: any) {
      console.error('Gagal mengekspor PDF:', err);
      toast.error(err.message || 'Gagal mengekspor dokumen ke PDF', { id: 'pdf-toast' });
    } finally {
      setIsExporting(false);
    }
  };

  const isGrc = selectedTemplate === 'grc_board';

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>Pratinjau & Cetak Struktur Organisasi</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 uppercase">
            {divisionCode}
          </span>
        </div>
      }
      subtitle={`Dokumen resmi bagan formasi dan penugasan ${effectiveTitle}`}
      orientation="landscape"
      allowOrientationToggle={false}
      allowLogoToggles={true}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={setShowLogoDaerah}
      onToggleLogoSekolah={setShowLogoSekolah}
      templateOptions={TEMPLATE_OPTIONS}
      selectedTemplate={selectedTemplate}
      onTemplateChange={setSelectedTemplate}
      templateLabel="Format Ukuran Cetak:"
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExporting ? 'Memproses PDF...' : isGrc ? 'Unduh PDF Papan GRC (2:1)' : 'Unduh PDF A4 Landscape'}
      printButtonText="Cetak Dokumen (Browser Print)"
      size="5xl"
    >
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* TEMPLATE 1: A4 LANDSCAPE (Standar Berkas Administrasi & Laporan)   */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {!isGrc && (
        <PrintDocumentSheet
          orientation="landscape"
          footerText={`Bagan Struktur Organisasi Resmi • ${effectiveTitle} • TP. ${tpNama}`}
          className="font-sans"
        >
          {/* 1. KOP SURAT RESMI */}
          <PrintHeader
            variant="landscape"
            showLogoDaerah={showLogoDaerah}
            showLogoSekolah={showLogoSekolah}
            showDivider={true}
          />

          {/* 2. JUDUL DOKUMEN */}
          <div className="text-center my-3 space-y-0.5">
            <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-black">
              BAGAN STRUKTUR ORGANISASI {effectiveTitle}
            </h2>
            <p className="text-[11px] font-bold uppercase text-slate-700">
              TAHUN PELAJARAN {tpNama} • SEMESTER {semNama.toUpperCase()}
            </p>
          </div>

          {/* 3. BAGAN POHON STRUKTUR RESMI */}
          <div className="my-5 flex flex-col items-center">
            {/* Kartu Pimpinan (Waka / Koordinator) */}
            <div className="w-72 border-2 border-black rounded-lg overflow-hidden shadow-xs bg-white text-center">
              <div className={cn("py-1 px-3 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1", theme.headerBg)}>
                <Crown size={12} className="text-amber-300 drop-shadow-xs" />
                <span>{leaderNode?.label || theme.roleTitle}</span>
              </div>
              <div className="p-2 bg-slate-50">
                <p className="text-xs font-bold text-black truncate">
                  {leaderNode?.subLabel && leaderNode.subLabel !== 'Belum Diisi' ? leaderNode.subLabel : '— Belum Ditugaskan —'}
                </p>
              </div>
            </div>

            {/* Garis Batang Vertikal */}
            <div className="w-[2px] h-6 bg-black" />

            {/* Garis Cabang Horizontal & Kartu Sub-Bidang */}
            {subNodes.length > 0 && (
              <div className="w-full relative flex flex-col items-center">
                {/* Garis Sayap Horizontal Menghubungkan Seluruh Sub-Bidang */}
                <div className="w-full relative h-[2px]">
                  <div className="absolute top-0 left-[8%] right-[8%] h-[2px] bg-black" />
                </div>

                {/* Grid Kartu Sub-Bidang */}
                <div className="w-full flex justify-center gap-3 pt-0">
                  {subNodes.map((sub, idx) => {
                    const isUnassigned = sub.data?.isUnassigned || sub.subLabel === 'Belum Diisi' || sub.subLabel === '—';
                    return (
                      <div key={sub.id || idx} className="flex flex-col items-center flex-1 max-w-[190px]">
                        {/* Garis drop vertikal */}
                        <div className="w-[2px] h-5 bg-black" />

                        {/* Kotak Sub-Bidang */}
                        <div className="w-full border border-black rounded-md overflow-hidden bg-white text-center shadow-2xs">
                          <div className="bg-slate-700 text-white py-1 px-1.5 text-[8.5px] font-bold uppercase tracking-tight truncate">
                            {sub.label}
                          </div>
                          <div className="p-1.5 min-h-[38px] flex items-center justify-center bg-slate-50/80">
                            <span className={cn("text-[9.5px] font-bold block truncate", isUnassigned ? "text-slate-400 italic font-normal" : "text-black")}>
                              {isUnassigned ? '— Belum Diisi —' : sub.subLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. TABEL RINCIAN FORMASI PEJABAT & STAF DIVISI */}
          <div className="mt-5 mb-4">
            <h4 className="text-[10px] font-bold uppercase text-slate-800 mb-1.5 tracking-wider">
              I. MATRIKS PENUGASAN FORMASI TIM {effectiveTitle}
            </h4>
            <table className="w-full border-collapse border border-black text-[9.5px]">
              <thead>
                <tr className="bg-slate-100 text-black">
                  <th className="border border-black py-1 px-2 text-center w-8">No</th>
                  <th className="border border-black py-1 px-3 text-left w-64">Nama Jabatan / Sub-Bidang</th>
                  <th className="border border-black py-1 px-3 text-left">Nama Personil / Guru Penugasan</th>
                  <th className="border border-black py-1 px-3 text-center w-36">Status Formasi</th>
                </tr>
              </thead>
              <tbody>
                {/* Baris Leader */}
                <tr>
                  <td className="border border-black py-1 px-2 text-center font-bold">1</td>
                  <td className="border border-black py-1 px-3 font-bold text-black">
                    {leaderNode?.label || theme.roleTitle} (Pimpinan)
                  </td>
                  <td className="border border-black py-1 px-3 font-bold text-black">
                    {leaderNode?.subLabel && leaderNode.subLabel !== 'Belum Diisi' ? leaderNode.subLabel : '— Belum Ditugaskan —'}
                  </td>
                  <td className="border border-black py-1 px-3 text-center font-semibold text-emerald-700">
                    Definitif (Pimpinan)
                  </td>
                </tr>
                {/* Baris Sub-Bidang */}
                {subNodes.map((sub, idx) => {
                  const isUnassigned = sub.data?.isUnassigned || sub.subLabel === 'Belum Diisi' || sub.subLabel === '—';
                  return (
                    <tr key={sub.id || idx}>
                      <td className="border border-black py-1 px-2 text-center">{idx + 2}</td>
                      <td className="border border-black py-1 px-3 font-semibold text-slate-900">{sub.label}</td>
                      <td className={cn("border border-black py-1 px-3", isUnassigned ? "italic text-slate-400 font-normal" : "font-bold text-black")}>
                        {isUnassigned ? 'Belum Diisi (Formasi Terbuka)' : sub.subLabel}
                      </td>
                      <td className="border border-black py-1 px-3 text-center font-medium">
                        {isUnassigned ? (
                          <span className="text-amber-600 font-semibold">Siap Ditugaskan</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">Aktif Ditugaskan</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 5. BLOK TANDA TANGAN RESMI (2-Tier Signature Engine) */}
          <div className="mt-8 page-break-inside-avoid">
            <UniversalDocumentSignatures
              layout="dual_unit_kepsek"
              titimangsaCity={tenantInfo?.kabupaten || 'Bandung'}
              titimangsaDate={todayStr}
              overrideSignerLeft={{
                roleTitle: theme.roleTitle,
                personName: leaderPerson.personName,
                nip: leaderPerson.nip,
              }}
              overrideSignerRight={{
                roleTitle: 'Kepala Sekolah',
                personName: signers.kepsek.personName,
                nip: signers.kepsek.nip,
              }}
              spacingHeightMm={18}
            />
          </div>
        </PrintDocumentSheet>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* TEMPLATE 2: PAPAN TULIS / PAPAN DINDING GRC (Rasio 2:1 / 240x120) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isGrc && (
        <div
          style={{
            width: '1588px',
            minWidth: '1588px',
            maxWidth: '1588px',
            minHeight: '794px',
          }}
          className="print-sheet bg-white text-slate-900 shadow-2xl rounded-sm p-10 select-text border-[6px] border-double border-slate-800 print:border-none print:shadow-none flex flex-col justify-between transition-shadow mx-auto font-sans"
        >
          {/* Header Kop Megah untuk Papan Dinding Sekolah */}
          <div className="border-b-4 border-slate-900 pb-4 mb-4">
            <PrintHeader
              variant="landscape"
              showLogoDaerah={showLogoDaerah}
              showLogoSekolah={showLogoSekolah}
              showDivider={false}
            />
            <div className="text-center mt-3 space-y-1">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-widest text-slate-950 font-serif">
                BAGAN STRUKTUR ORGANISASI {effectiveTitle}
              </h1>
              <p className="text-sm font-black uppercase tracking-wider text-slate-800">
                TAHUN PELAJARAN {tpNama} • SEMESTER {semNama.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Main Giant Visual Flowchart */}
          <div className="my-auto py-4 flex flex-col items-center">
            {/* Level 1: Leader Pimpinan Divisi */}
            <div className="w-96 border-4 border-slate-900 rounded-xl overflow-hidden shadow-md bg-white text-center">
              <div className={cn("py-2.5 px-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-xs", theme.headerBg)}>
                <Crown size={16} className="text-amber-300 drop-shadow-md" />
                <span>{leaderNode?.label || theme.roleTitle}</span>
              </div>
              <div className="p-3 bg-slate-50 border-t-2 border-slate-300">
                <p className="text-base font-black text-slate-950 tracking-tight">
                  {leaderNode?.subLabel && leaderNode.subLabel !== 'Belum Diisi' ? leaderNode.subLabel : '— Belum Ditugaskan —'}
                </p>
                <p className="text-xs font-mono text-slate-600 font-semibold mt-0.5">
                  {leaderPerson.nip ? `NIP. ${leaderPerson.nip}` : 'Pimpinan Bidang'}
                </p>
              </div>
            </div>

            {/* Garis Batang Vertikal Utama */}
            <div className="w-1 h-8 bg-slate-900" />

            {/* Horizontal Branching ke Seluruh Sub-Bidang */}
            {subNodes.length > 0 && (
              <div className="w-full relative flex flex-col items-center">
                {/* Garis Sayap Horizontal GRC */}
                <div className="w-full relative h-1">
                  <div className="absolute top-0 left-[6%] right-[6%] h-1 bg-slate-900 rounded-full" />
                </div>

                {/* Barisan Horizontal Kartu Sub-Bidang */}
                <div className="w-full flex justify-center gap-4 pt-0">
                  {subNodes.map((sub, idx) => {
                    const isUnassigned = sub.data?.isUnassigned || sub.subLabel === 'Belum Diisi' || sub.subLabel === '—';
                    return (
                      <div key={sub.id || idx} className="flex flex-col items-center flex-1 max-w-[245px]">
                        {/* Garis drop vertikal */}
                        <div className="w-1 h-6 bg-slate-900" />

                        {/* Kartu Sub-Bidang GRC Board */}
                        <div className="w-full border-2 border-slate-900 rounded-lg overflow-hidden bg-white text-center shadow-md">
                          <div className="bg-slate-800 text-white py-1.5 px-2 text-[10.5px] font-black uppercase tracking-tight truncate border-b border-slate-700">
                            {sub.label}
                          </div>
                          <div className="p-2.5 min-h-[56px] flex flex-col items-center justify-center bg-slate-50/90">
                            <span className={cn("text-xs font-black block leading-tight", isUnassigned ? "text-slate-400 italic font-semibold" : "text-slate-950")}>
                              {isUnassigned ? '— Belum Diisi —' : sub.subLabel}
                            </span>
                            <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                              {isUnassigned ? 'Formasi Terbuka' : 'Staf Pendukung'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Pengesahan Resmi Papan Sekolah */}
          <div className="pt-4 border-t-4 border-slate-900 flex justify-between items-end text-xs font-serif">
            {/* Kiri: Waka */}
            <div className="text-left w-72">
              <p className="font-semibold text-slate-700">Mengetahui / Mengesahkan,</p>
              <p className="font-bold text-black">{theme.roleTitle}</p>
              <div className="h-16" />
              <p className="font-black text-black underline text-sm tracking-wide">
                {leaderPerson.personName}
              </p>
              <p className="font-mono text-[11px] text-slate-800 font-semibold">
                {leaderPerson.nip ? `NIP. ${leaderPerson.nip}` : 'NIP. —'}
              </p>
            </div>

            {/* Tengah: Lencana Catatan Papan Sekolah */}
            <div className="text-center font-sans">
              <span className="inline-block px-4 py-1.5 rounded-full border-2 border-slate-800 bg-slate-100 font-black text-xs uppercase tracking-widest text-slate-900">
                Papan Informasi Resmi Sekolah
              </span>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">
                Dicetak melalui Absenta.id Enterprise • Universal Document Printing Engine
              </p>
            </div>

            {/* Kanan: Kepala Sekolah */}
            <div className="text-right w-72">
              <p className="font-semibold text-slate-700">
                {tenantInfo?.kabupaten || 'Bandung'}, {todayStr}
              </p>
              <p className="font-bold text-black">Kepala Sekolah,</p>
              <div className="h-16" />
              <p className="font-black text-black underline text-sm tracking-wide">
                {signers.kepsek.personName}
              </p>
              <p className="font-mono text-[11px] text-slate-800 font-semibold">
                {signers.kepsek.nip ? `NIP. ${signers.kepsek.nip}` : 'NIP. —'}
              </p>
            </div>
          </div>
        </div>
      )}
    </UniversalDocumentModal>
  );
};
