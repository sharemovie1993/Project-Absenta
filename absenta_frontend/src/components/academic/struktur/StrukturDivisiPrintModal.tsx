import React, { useState, useMemo } from 'react';
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
import { Crown } from 'lucide-react';
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
    label: 'A4 Landscape (2 Lembar: Bagan + Matriks Tupoksi)',
    description: 'Ukuran kertas standar dinas (297 × 210 mm) lengkap dengan rincian tugas pokok.',
    badge: 'A4 Dinas',
  },
  {
    id: 'grc_board',
    label: 'Papan Tulis / Papan Dinding GRC (Format Banner 2:1)',
    description: 'Ukuran papan dinding kantor sekolah (rasio 2:1 / 240 × 120 cm).',
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
    name: 'KURIKULUM',
    roleTitle: 'Waka Bidang Kurikulum',
    headerBg: 'bg-emerald-700 text-white',
    borderColor: 'border-emerald-700',
    textColor: 'text-emerald-800',
    accentBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  KESISWAAN: {
    name: 'KESISWAAN',
    roleTitle: 'Waka Bidang Kesiswaan',
    headerBg: 'bg-amber-600 text-white',
    borderColor: 'border-amber-600',
    textColor: 'text-amber-800',
    accentBadge: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  HUBIN: {
    name: 'HUBUNGAN INDUSTRI & MASYARAKAT (HUBIN)',
    roleTitle: 'Waka Bidang Hubin',
    headerBg: 'bg-cyan-700 text-white',
    borderColor: 'border-cyan-700',
    textColor: 'text-cyan-800',
    accentBadge: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  },
  SARPRAS: {
    name: 'SARANA & PRASARANA (SARPRAS)',
    roleTitle: 'Waka Bidang Sarpras',
    headerBg: 'bg-indigo-700 text-white',
    borderColor: 'border-indigo-700',
    textColor: 'text-indigo-800',
    accentBadge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
  TU_KEPALA: {
    name: 'TATA USAHA (TU)',
    roleTitle: 'Kepala Tata Usaha',
    headerBg: 'bg-blue-700 text-white',
    borderColor: 'border-blue-700',
    textColor: 'text-blue-800',
    accentBadge: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  BKK: {
    name: 'BURSA KERJA KHUSUS (BKK)',
    roleTitle: 'Ketua / Koordinator BKK',
    headerBg: 'bg-violet-700 text-white',
    borderColor: 'border-violet-700',
    textColor: 'text-violet-800',
    accentBadge: 'bg-violet-100 text-violet-800 border-violet-300',
  },
  BPBK: {
    name: 'BIMBINGAN & KONSELING (BP/BK)',
    roleTitle: 'Koordinator Guru BP/BK',
    headerBg: 'bg-rose-700 text-white',
    borderColor: 'border-rose-700',
    textColor: 'text-rose-800',
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
    name: divisionCode,
    roleTitle: `Koordinator ${divisionCode}`,
    headerBg: 'bg-slate-800 text-white',
    borderColor: 'border-slate-800',
    textColor: 'text-slate-800',
    accentBadge: 'bg-slate-100 text-slate-800 border-slate-300',
  };

  const tpNama = activeYear?.tahun || '2026/2027';
  const semNama = activeSemester?.nama || 'Ganjil';

  // 2. Bersihkan judul divisi agar tidak terulang (e.g. "BAGAN STRUKTUR ORGANISASI STRUKTUR ORGANISASI KURIKULUM")
  const cleanDivisionName = useMemo(() => {
    const raw = divisionTitle || theme.name;
    return raw
      .replace(/BAGAN|STRUKTUR ORGANISASI|STRUKTUR|ORGANISASI|DIVISI/gi, '')
      .trim()
      .toUpperCase();
  }, [divisionTitle, theme.name]);

  // 3. Ekstrak data Leader & Sub-Bidangs dari treeData
  const { leaderNode, subNodes } = useMemo(() => {
    if (!treeData) return { leaderNode: null, subNodes: [] };

    let leader: TopologyNodeData | null = null;
    let subs: TopologyNodeData[] = [];

    // Jika root adalah CATEGORY:
    if (treeData.type === 'CATEGORY' && treeData.children && treeData.children.length > 0) {
      leader = treeData.children[0];
      if (leader.children && leader.children.length > 0) {
        subs = leader.children.filter((c) => !c.id?.startsWith('add-new-'));
      } else if (treeData.children.length > 1) {
        subs = treeData.children.slice(1).filter((c) => !c.id?.startsWith('add-new-'));
      }
    } else if (treeData.type === 'STRUCT') {
      leader = treeData;
      subs = (treeData.children || []).filter((c) => !c.id?.startsWith('add-new-'));
    }

    return { leaderNode: leader, subNodes: subs };
  }, [treeData]);

  // Data kamus flag untuk deskripsi Tupoksi
  const officialFlags = useMemo(() => {
    return getAssignmentFlagsForPosition(divisionCode);
  }, [divisionCode]);

  // Resolve data pimpinan
  const leaderPerson = useMemo(() => {
    const name = leaderNode?.subLabel && leaderNode.subLabel !== 'Belum Diisi' && leaderNode.subLabel !== '—'
      ? leaderNode.subLabel
      : '............................................';
    const nip = (leaderNode?.data as any)?.nip || '';
    return {
      roleTitle: theme.roleTitle,
      personName: name,
      nip,
    };
  }, [leaderNode, theme.roleTitle]);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // 4. Dual-Engine PDF Download Handler (html2canvas-pro + jsPDF)
  // Menghilangkan kerning collapse dengan mematikan CSS zoom sementara sebelum capture
  const handleDownloadPdf = async () => {
    const deskCanvas = document.getElementById('print-desk-canvas-area');
    const prevZoom = deskCanvas ? deskCanvas.style.zoom : '';

    try {
      setIsExporting(true);
      toast.loading('Menyiapkan dokumen PDF True WYSIWYG...', { id: 'pdf-toast' });

      // ── MATIKAN ZOOM PADA DOM ASLI UNTUK MENCEGAH KERNING COLLAPSE CHROMIUM ──
      if (deskCanvas) {
        deskCanvas.style.zoom = '1';
        void deskCanvas.offsetHeight; // Force reflow sinkron
      }

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const sheetElements = document.querySelectorAll('.print-sheet');
      if (!sheetElements || sheetElements.length === 0) {
        toast.error('Lembar dokumen tidak ditemukan', { id: 'pdf-toast' });
        setIsExporting(false);
        return;
      }

      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const isGrc = selectedTemplate === 'grc_board';

      if (isGrc) {
        // ── EKSPOR PAPAN GRC (Format Banner Rasio 2:1 / 420 × 210 mm) ──
        const sheet = sheetElements[0] as HTMLElement;
        const canvas = await html2canvas(sheet, {
          scale: 1.6,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            const clonedDesk = clonedDoc.getElementById('print-desk-canvas-area');
            if (clonedDesk) {
              clonedDesk.style.zoom = '1';
              (clonedDesk.style as any).transform = 'none';
            }
            const allSheets = clonedDoc.querySelectorAll('.print-sheet');
            allSheets.forEach((s: any) => {
              s.style.zoom = '1';
              s.style.transform = 'none';
              s.style.letterSpacing = 'normal';
              s.style.border = 'none';
              s.style.boxShadow = 'none';
              s.style.outline = 'none';
            });
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.88);
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [420, 210],
          compress: true,
        });

        const canvasRatio = canvas.height / canvas.width;
        const imgHeight = 420 * canvasRatio;

        pdf.addImage(imgData, 'JPEG', 0, 0, 420, Math.min(210, imgHeight), undefined, 'FAST');
        pdf.save(`Bagan_Papan_GRC_${cleanDivisionName}_${tpNama.replace('/', '-')}.pdf`);

      } else {
        // ── EKSPOR A4 LANDSCAPE (2 Lembar: Bagan + Matriks Tupoksi) ──
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
          compress: true,
        });

        const pdfWidth = 297;
        const pdfHeight = 210;

        for (let i = 0; i < sheetElements.length; i++) {
          if (i > 0) {
            pdf.addPage('a4', 'landscape');
          }

          const sheet = sheetElements[i] as HTMLElement;
          const canvas = await html2canvas(sheet, {
            scale: 2.0,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            onclone: (clonedDoc) => {
              const clonedDesk = clonedDoc.getElementById('print-desk-canvas-area');
              if (clonedDesk) {
                clonedDesk.style.zoom = '1';
                (clonedDesk.style as any).transform = 'none';
              }
              const allSheets = clonedDoc.querySelectorAll('.print-sheet');
              allSheets.forEach((s: any) => {
                s.style.zoom = '1';
                s.style.transform = 'none';
                s.style.letterSpacing = 'normal';
                s.style.border = 'none';
                s.style.boxShadow = 'none';
                s.style.outline = 'none';
              });
            },
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.88);
          const canvasRatio = canvas.height / canvas.width;
          const imgHeight = pdfWidth * canvasRatio;

          // Render proporsional presisi sesuai kaidah universal-document-printing-pdf skill
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, imgHeight), undefined, 'FAST');
        }

        pdf.save(`Struktur_Organisasi_${cleanDivisionName}_${tpNama.replace('/', '-')}.pdf`);
      }

      toast.success('Dokumen PDF berhasil diunduh (True WYSIWYG)', { id: 'pdf-toast' });
    } catch (err: any) {
      console.error('Gagal mengekspor PDF:', err);
      toast.error(err.message || 'Gagal mengekspor dokumen ke PDF', { id: 'pdf-toast' });
    } finally {
      // ── KEMBALIKAN ZOOM DOM KE POSISI ASLI ──
      if (deskCanvas) {
        deskCanvas.style.zoom = prevZoom;
      }
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
      subtitle={`Dokumen resmi bagan formasi dan penugasan ${theme.roleTitle}`}
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
      downloadPdfText={isExporting ? 'Memproses PDF...' : isGrc ? 'Unduh PDF Papan GRC (2:1)' : 'Unduh PDF A4 Landscape (2 Hal)'}
      printButtonText="Cetak Dokumen (Browser Print)"
      size="5xl"
    >
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* TEMPLATE 1: A4 LANDSCAPE (Standar Berkas Administrasi & Laporan)   */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {!isGrc && (
        <div className="flex flex-col gap-8 w-full items-center">
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* LEMBAR 1: BAGAN STRUKTUR POHON RESMI                            */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <PrintDocumentSheet
            orientation="landscape"
            pageNumber={1}
            totalPages={2}
            footerText={`Bagan Struktur Organisasi Resmi • Bidang ${cleanDivisionName} • TP. ${tpNama}`}
            className="font-sans"
            style={{ letterSpacing: 'normal' }}
          >
            {/* 1. KOP SURAT RESMI */}
            <PrintHeader
              variant="landscape"
              showLogoDaerah={showLogoDaerah}
              showLogoSekolah={showLogoSekolah}
              showDivider={true}
            />

            {/* 2. JUDUL DOKUMEN RESMI (Tanpa Pengulangan Kata) */}
            <div className="text-center my-3 space-y-0.5">
              <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-black font-serif">
                STRUKTUR ORGANISASI BIDANG {cleanDivisionName}
              </h2>
              <p className="text-[11px] font-bold uppercase text-slate-700 tracking-wide">
                TAHUN PELAJARAN {tpNama} • SEMESTER {semNama.toUpperCase()}
              </p>
            </div>

            {/* 3. BAGAN POHON STRUKTUR HORIZONTAL WYSIWYG */}
            <div className="my-5 flex flex-col items-center">
              {/* Kartu Pimpinan (Waka / Koordinator) */}
              <div className="w-80 border-2 border-black rounded-lg overflow-hidden shadow-xs bg-white text-center">
                <div className={cn("py-1.5 px-3 text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5", theme.headerBg)}>
                  <Crown size={13} className="text-amber-300 drop-shadow-xs" />
                  <span>{leaderNode?.label || theme.roleTitle}</span>
                </div>
                <div className="p-2.5 bg-slate-50 min-h-[46px] flex flex-col items-center justify-center">
                  <p className="text-xs font-bold text-black text-center whitespace-normal break-words leading-tight px-1">
                    {leaderPerson.personName}
                  </p>
                  {leaderPerson.nip && (
                    <p className="text-[9.5px] font-mono text-slate-600 mt-0.5">
                      NIP. {leaderPerson.nip}
                    </p>
                  )}
                </div>
              </div>

              {/* Garis Batang Vertikal */}
              <div className="w-[2px] h-7 bg-black" />

              {/* Garis Cabang Horizontal & Kartu Sub-Bidang */}
              {subNodes.length > 0 && (
                <div className="w-full relative flex flex-col items-center">
                  {/* Garis Sayap Horizontal */}
                  <div className="w-full relative h-[2px]">
                    <div className="absolute top-0 left-[7%] right-[7%] h-[2px] bg-black" />
                  </div>

                  {/* Grid Kartu Sub-Bidang Horizontal */}
                  <div className="w-full flex justify-center gap-3 pt-0">
                    {subNodes.map((sub, idx) => {
                      const isUnassigned = sub.data?.isUnassigned || sub.subLabel === 'Belum Diisi' || sub.subLabel === '—';
                      return (
                        <div key={sub.id || idx} className="flex flex-col items-center flex-1 max-w-[200px]">
                          {/* Garis drop vertikal */}
                          <div className="w-[2px] h-5 bg-black" />

                          {/* Kotak Sub-Bidang */}
                          <div className="w-full border border-black rounded-md overflow-hidden bg-white text-center shadow-2xs">
                            <div className="bg-slate-800 text-white py-1 px-1.5 text-[8.5px] font-bold uppercase tracking-tight text-center leading-tight min-h-[26px] flex items-center justify-center">
                              {sub.label}
                            </div>
                            <div className="p-2 min-h-[46px] flex items-center justify-center bg-slate-50/90">
                              <span className={cn(
                                "text-[10px] text-center whitespace-normal break-words leading-tight px-0.5",
                                isUnassigned ? "text-slate-400 italic font-normal" : "font-bold text-black"
                              )}>
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

            {/* 4. TANDA TANGAN RESMI PENGESAHAN LEMBAR 1 */}
            <div className="mt-8 page-break-inside-avoid">
              <UniversalDocumentSignatures
                layout="dual_unit_kepsek"
                titimangsaCity={tenantInfo?.kabupaten || 'Purwakarta'}
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

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* LEMBAR 2: MATRIKS FORMASI & URAIAN TUGAS POKOK (TUPOKSI)        */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <PrintDocumentSheet
            orientation="landscape"
            pageNumber={2}
            totalPages={2}
            footerText={`Matriks Uraian Tugas Pokok & Fungsi • Bidang ${cleanDivisionName} • TP. ${tpNama}`}
            className="font-sans"
            style={{ letterSpacing: 'normal' }}
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
              <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-black font-serif">
                MATRIKS FORMASI DAN URAIAN TUGAS POKOK (TUPOKSI)
              </h2>
              <p className="text-[11px] font-bold uppercase text-slate-700">
                TIM KERJA BIDANG {cleanDivisionName} • TAHUN PELAJARAN {tpNama}
              </p>
            </div>

            {/* 3. TABEL LENGKAP DENGAN URAIAN TUPOKSI */}
            <div className="my-4">
              <table className="w-full border-collapse border border-black text-[9.5px]">
                <thead>
                  <tr className="bg-slate-100 text-black">
                    <th className="border border-black py-1.5 px-2 text-center w-8">No</th>
                    <th className="border border-black py-1.5 px-3 text-left w-56">Jabatan / Sub-Bidang</th>
                    <th className="border border-black py-1.5 px-3 text-left">Uraian Tugas Pokok & Fungsi (Tupoksi)</th>
                    <th className="border border-black py-1.5 px-3 text-left w-56">Nama Personil / Guru</th>
                    <th className="border border-black py-1.5 px-2 text-center w-28">Status Penugasan</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Baris Pimpinan / Waka */}
                  <tr>
                    <td className="border border-black py-1.5 px-2 text-center font-bold">1</td>
                    <td className="border border-black py-1.5 px-3 font-bold text-black">
                      {leaderNode?.label || theme.roleTitle}
                    </td>
                    <td className="border border-black py-1.5 px-3 text-slate-800 leading-snug">
                      Pimpinan & penanggung jawab teknis koordinasi bidang, perumusan program kerja tahunan, serta pengesahan dokumen resmi operasional bidang.
                    </td>
                    <td className="border border-black py-1.5 px-3 font-bold text-black">
                      {leaderPerson.personName}
                    </td>
                    <td className="border border-black py-1.5 px-2 text-center font-semibold text-emerald-700 bg-emerald-50/50">
                      Definitif (Pimpinan)
                    </td>
                  </tr>

                  {/* Baris Sub-Bidang */}
                  {subNodes.map((sub, idx) => {
                    const isUnassigned = sub.data?.isUnassigned || sub.subLabel === 'Belum Diisi' || sub.subLabel === '—';
                    // Cocokkan flag untuk mengambil deskripsi Tupoksi resmi
                    const matchedFlag = officialFlags.find((f) => f.flag === sub.data?.assignmentFlag) ||
                                       officialFlags.find((f) => sub.label.toUpperCase().includes(f.label.toUpperCase().replace(/BIDANG|STAF|KOORDINATOR/gi, '').trim()));
                    const tupoksi = matchedFlag?.description || 'Membantu pimpinan dalam pelaksanaan program kerja teknis, pengelolaan administrasi, dan pelaporan bidang.';

                    return (
                      <tr key={sub.id || idx}>
                        <td className="border border-black py-1.5 px-2 text-center font-medium">{idx + 2}</td>
                        <td className="border border-black py-1.5 px-3 font-bold text-slate-900">{sub.label}</td>
                        <td className="border border-black py-1.5 px-3 text-slate-800 leading-snug">{tupoksi}</td>
                        <td className={cn("border border-black py-1.5 px-3", isUnassigned ? "italic text-slate-400 font-normal" : "font-bold text-black")}>
                          {isUnassigned ? '— Belum Diisi —' : sub.subLabel}
                        </td>
                        <td className="border border-black py-1.5 px-2 text-center font-medium">
                          {isUnassigned ? (
                            <span className="text-amber-700 font-bold">Formasi Terbuka</span>
                          ) : (
                            <span className="text-emerald-700 font-bold">Aktif Ditugaskan</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4. TANDA TANGAN RESMI PENGESAHAN LEMBAR 2 */}
            <div className="mt-8 page-break-inside-avoid">
              <UniversalDocumentSignatures
                layout="dual_unit_kepsek"
                titimangsaCity={tenantInfo?.kabupaten || 'Purwakarta'}
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
        </div>
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
            letterSpacing: 'normal',
          }}
          className="print-sheet bg-white text-slate-900 shadow-2xl rounded-sm p-10 select-text border-[6px] border-double border-slate-900 print:border-none print:shadow-none flex flex-col justify-between transition-shadow mx-auto font-sans"
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
                BAGAN STRUKTUR ORGANISASI BIDANG {cleanDivisionName}
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
              <div className="p-3 bg-slate-50 border-t-2 border-slate-300 min-h-[64px] flex flex-col items-center justify-center">
                <p className="text-base font-black text-slate-950 tracking-tight text-center whitespace-normal break-words leading-tight px-1">
                  {leaderPerson.personName}
                </p>
                {leaderPerson.nip && (
                  <p className="text-xs font-mono text-slate-600 font-semibold mt-0.5">
                    NIP. {leaderPerson.nip}
                  </p>
                )}
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
                      <div key={sub.id || idx} className="flex flex-col items-center flex-1 max-w-[250px]">
                        {/* Garis drop vertikal */}
                        <div className="w-1 h-6 bg-slate-900" />

                        {/* Kartu Sub-Bidang GRC Board */}
                        <div className="w-full border-2 border-slate-900 rounded-lg overflow-hidden bg-white text-center shadow-md">
                          <div className="bg-slate-800 text-white py-1.5 px-2 text-[10.5px] font-black uppercase tracking-tight text-center leading-tight min-h-[34px] flex items-center justify-center border-b border-slate-700">
                            {sub.label}
                          </div>
                          <div className="p-2.5 min-h-[64px] flex flex-col items-center justify-center bg-slate-50/90">
                            <span className={cn(
                              "text-xs font-black block leading-tight text-center whitespace-normal break-words px-1",
                              isUnassigned ? "text-slate-400 italic font-semibold" : "text-slate-950"
                            )}>
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
                {tenantInfo?.kabupaten || 'Purwakarta'}, {todayStr}
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
